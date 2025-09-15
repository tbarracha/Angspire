// =============================================
// File: Host/Program.cs
// =============================================
using System.Reflection;
using System.Runtime.Loader;
using App.Core.Files;
using App.Shared.Seeder;
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
        {
            foreach (var le in rtle.LoaderExceptions)
                CrashTelemetry.MarkFatal("LoaderException", le);
        }
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

// ---- App services (unchanged) ----
builder.Services.AddOpenApi("Genspire API", "Genspire Monolithic API", "v1");
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
        opts.DatabaseAlias = "genspire_domain";
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
    options.AddPolicy("FrontendDev", policy =>
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
app.UseCors("FrontendDev");

app.UseAuthentication();
app.UseAuthorization();
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(15) });

// RateLimiter must be in the middleware pipeline (after Build, before endpoints)
app.UseRateLimiter();

app.UseOpenApi(endpointName: "Genspire API");

app.MapOperationsEndpoints(log: true, mapHub: true);
app.MapControllers();

// Guard seeder — persist failure quietly
try { await app.Services.SeedAsync(); }
catch (Exception ex)
{
    CrashTelemetry.MarkFatal("Seeder", ex);
    CrashTelemetry.FlushToDisk(builder.Environment.ContentRootPath);
    // Optionally: rethrow if you want startup to fail-fast
    // throw;
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
