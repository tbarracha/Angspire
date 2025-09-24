// =============================================
// File: Host/Program.cs - Identity-aware
// =============================================
using System.Reflection;
using System.Runtime.Loader;
using System.Globalization;
using System.Text.RegularExpressions;
using App.Core.Files;
using Seeding;
using Aspire.ServiceDefaults;
using Authentication;
using Microsoft.AspNetCore.Http.Json;
using Shared.Database;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo;
using SpireCore.API.Diagnostics;
using SpireCore.API.JWT;
using SpireCore.API.JWT.Identity;
using SpireCore.API.Swagger;
using SpireCore.API.WebSockets;
using SpireCore.Events.Dispatcher;
using SpireCore.Repositories;
using SpireCore.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ---- Identity from appsettings (ServiceIdentity) ----
var serviceName = builder.Configuration["ServiceIdentity:ServiceName"] ??
                  AppDomain.CurrentDomain.FriendlyName ?? "App";
var serviceDesc = builder.Configuration["ServiceIdentity:Description"] ?? serviceName;
string Slugify(string s)
{
    var lower = s.Trim().ToLowerInvariant();
    var replaced = Regex.Replace(lower, @"[^a-z0-9]+", "-");
    replaced = Regex.Replace(replaced, @"-+", "-").Trim('-');
    return string.IsNullOrWhiteSpace(replaced) ? "app" : replaced;
}
string TrimCommonSuffix(string slug)
{
    var parts = slug.Split('-', StringSplitOptions.RemoveEmptyEntries).ToList();
    if (parts.Count == 0) return slug;
    var last = parts[^1];
    var drop = new HashSet<string> { "api", "service", "app", "server", "backend", "web" };
    if (drop.Contains(last) && parts.Count > 1) parts.RemoveAt(parts.Count - 1);
    return string.Join('-', parts);
}
string Pascalize(string input)
{
    var cleaned = Regex.Replace(input, @"[^A-Za-z0-9]+", " ");
    var ti = CultureInfo.InvariantCulture.TextInfo;
    var words = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                       .Select(w => ti.ToTitleCase(w.ToLowerInvariant()));
    return string.Concat(words);
}

var slug = TrimCommonSuffix(Slugify(serviceName));   // e.g., "angspire"
var pascalName = Pascalize(serviceName);                   // e.g., "Angspire"
var mongoAlias = $"{slug}_domain";                         // e.g., "angspire_domain"
var corsPolicy = $"{pascalName}FrontendDev";               // unique per service

// Aspire defaults 
builder.AddServiceDefaults();

// ---- Minimal telemetry markers (no console logging) ----
CrashTelemetry.MarkLifecycle("starting");
CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath);

// Global exception hooks -> write CrashTelemetry only
AppDomain.CurrentDomain.UnhandledException += (s, e) =>
{
    var ex = e.ExceptionObject as Exception ?? new Exception("unknown");
    CrashTelemetry.MarkFatal("AppDomain.UnhandledException", ex);
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath, Environment.ExitCode);
};
TaskScheduler.UnobservedTaskException += (s, e) =>
{
    e.SetObserved();
    CrashTelemetry.MarkFatal("TaskScheduler.UnobservedTaskException", e.Exception);
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath, Environment.ExitCode);
};
// First-chance: capture loader errors without logging to console
AppDomain.CurrentDomain.FirstChanceException += (s, e) =>
{
    if (e.Exception is ReflectionTypeLoadException rtle)
    {
        CrashTelemetry.MarkFatal("FirstChance.ReflectionTypeLoadException", rtle);
        if (rtle.LoaderExceptions is { Length: > 0 })
            foreach (var le in rtle.LoaderExceptions) CrashTelemetry.MarkFatal("LoaderException", le);
        CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath);
    }
};
// Signals/unload/process-exit -> persist last state
Console.CancelKeyPress += (s, e) =>
{
    CrashTelemetry.MarkSignal("ctrl_c");
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath);
};
AssemblyLoadContext.Default.Unloading += _ =>
{
    CrashTelemetry.MarkSignal("unloading", "Host unloading (SIGTERM/stop)");
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath);
};
AppDomain.CurrentDomain.ProcessExit += (s, e) =>
{
    CrashTelemetry.MarkSignal("process_exit");
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath, Environment.ExitCode);
};

// Keep host alive long enough to persist telemetry if a BackgroundService throws
builder.Services.Configure<HostOptions>(o =>
{
    o.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

// --------------------------------------------------------------------
// AddMemoryCache MUST be registered BEFORE builder.Build()
// --------------------------------------------------------------------
builder.Services.AddMemoryCache();

// ---- App services (identity-driven) ----
builder.Services.AddOpenApi(serviceName, serviceDesc, "v1");
builder.Services.AddSingleton<IJwtIdentityService, JwtIdentityService>();
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

var dbProfileSettings = builder.Services.AddDbSettings(builder.Configuration);
var overrideProfile = Environment.GetEnvironmentVariable("DB_PROFILE");
if (!string.IsNullOrWhiteSpace(overrideProfile))
    dbProfileSettings.SwitchProfile(overrideProfile);

builder.Services.AddSingleton<IModuleDatabaseProvider, ModuleDatabaseProvider>();
builder.Services.AddMongoDb(
    builder.Configuration,
    opts =>
    {
        // Use identity-derived default alias; ModuleDatabaseProvider already maps rich aliases
        opts.DatabaseAlias = mongoAlias;
    });

builder.Services.AddDomainEventDispatcher();
builder.Services.AddAuthentication(dbProfileSettings);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddFileSystem(builder.Configuration);
builder.Services.AddOperations();
builder.Services.AddApplicationRepositories(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddSingleton<IWebSocketConnectionTracker, InMemoryWebSocketConnectionTracker>();
builder.Services.AddHostedService<WebSocketWatchdogService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, policy =>
        policy
            .WithOrigins("http://localhost:4200", "https://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Quiet lifecycle tracker (no ILogger)
builder.Services.AddHostedService(sp => new LifecycleTracker(
    sp.GetRequiredService<IHostApplicationLifetime>(),
    builder.Environment.ContentRootPath));

var app = builder.Build();

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseHttpsRedirection();
app.UseCors(corsPolicy);

app.UseAuthentication();
app.UseAuthorization();
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(15) });

// RateLimiter must be in the middleware pipeline (after Build, before endpoints)
app.UseRateLimiter();

// OpenAPI endpoint name uses the configured service identity
app.UseOpenApi(endpointName: serviceName);

app.MapOperationsEndpoints(log: true, mapHub: true);
app.MapControllers();

// Guard seeder — persist failure quietly
try { await app.Services.SeedAsync(); }
catch (Exception ex)
{
    CrashTelemetry.MarkFatal("Seeder", ex);
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath);
}

// Minimal endpoint to fetch last-exit file (dev-only)
app.MapGet("/__last-exit", () =>
{
    var path = Path.Combine(builder.Environment.ContentRootPath, "logs", "last-exit.json");
    return System.IO.File.Exists(path)
        ? Results.File(path, "application/json")
        : Results.NotFound(new { error = "No last-exit.json yet." });
});

app.Run();

// ----------------- helpers -----------------
sealed class LifecycleTracker : IHostedService
{
    private readonly IHostApplicationLifetime _life;
    private readonly string _root;
    public LifecycleTracker(IHostApplicationLifetime life, string root)
    {
        _life = life;
        _root = root;
    }

    public Task StartAsync(CancellationToken ct)
    {
        _life.ApplicationStarted.Register(() =>
        {
            CrashTelemetry.MarkLifecycle("started");
            CrashTelemetry.FlushToDisk(_root);
        });
        _life.ApplicationStopping.Register(() =>
        {
            CrashTelemetry.MarkLifecycle("stopping");
            CrashTelemetry.FlushToDisk(_root);
        });
        _life.ApplicationStopped.Register(() =>
        {
            CrashTelemetry.MarkLifecycle("stopped");
            CrashTelemetry.FlushToDisk(_root, Environment.ExitCode);
        });
        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
