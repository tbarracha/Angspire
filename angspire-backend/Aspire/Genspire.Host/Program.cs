using Genspire.Application.Features;
using Genspire.Application.Modules;
using Genspire.Application.Modules.Authentication.Configuration;
using Genspire.Application.Modules.Authentication.Infrastructure;
using Genspire.Infrastructure.Authentication;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using SpireCore.API.Configuration.Features;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.JWT;
using SpireCore.API.JWT.Identity;
using SpireCore.API.Swagger;
using SpireCore.Events.Dispatcher;
using SpireCore.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// --- Core & app-specific services ---
builder.Services.AddOpenApi("Genspire API", "Genspire Monolithic API", "v1");
builder.Services.AddSingleton<IJwtIdentityService, JwtIdentityService>();
builder.Services.Configure<JsonOptions>(options =>
{
    // Convert enums → strings
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());

    // Global camelCase for all DTOs
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;

    // (Optional) case-insensitive matching
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

builder.Services.Configure<AuthenticationOptions>(
    builder.Configuration.GetSection("Modules:Authentication:Configuration"));

builder.Services.AddHttpClient("AIProviderClient")
    .ConfigureHttpClient((sp, client) =>
    {
        var config = sp.GetRequiredService<IConfiguration>();
        var defaultTimeout = config.GetValue<int?>("AI:DefaultTimeoutSeconds") ?? 100;
        client.Timeout = TimeSpan.FromSeconds(defaultTimeout);
    });

// --- Configuration binding ---
builder.Services.Configure<ModulesConfigurationList>(
    builder.Configuration.GetSection("Modules"));
builder.Services.Configure<FeaturesConfigurationList>(
    builder.Configuration.GetSection("Features"));

// register our Mongo module‐database provider
builder.Services.AddSingleton<IModuleDatabaseProvider, ModuleDatabaseProvider>();
BsonSerializer.RegisterSerializer(typeof(Guid), new GuidSerializer(BsonType.String));
BsonSerializer.RegisterSerializer(typeof(Guid?), new NullableSerializer<Guid>(new GuidSerializer(BsonType.String)));

// build a temp provider to read the module settings
using var tempProvider = builder.Services.BuildServiceProvider();
var modulesConfig = tempProvider
    .GetRequiredService<IOptions<ModulesConfigurationList>>()
    .Value;

// --- EF Core module contexts ---
// Auth module (PostgreSQL)
if (modulesConfig.TryGetValue("Authentication", out var authModule)
    && authModule.Enabled
    && authModule.DbConnection.Provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<BaseAuthDbContext, AuthDbContext>(opts =>
        opts.UseNpgsql(authModule.DbConnection.ConnectionString));
}

// (Any other SQL modules follow the same pattern)

// --- Event dispatcher, modules & domain services ---
builder.Services.AddDomainEventDispatcher();
builder.Services.FilterEnabledModules(modulesConfig);
builder.Services.AddJwtAuthentication(builder.Configuration);

var featuresConfig = tempProvider
    .GetRequiredService<IOptions<FeaturesConfigurationList>>()
    .Value;
builder.Services.AddEnabledFeatures(featuresConfig);

builder.Services.AddOperations();
builder.Services.AddApplicationRepositories(builder.Configuration);
builder.Services.AddApplicationServices();

// --- Swagger & API Explorer ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors();

var app = builder.Build();

// --- Middleware & Routing ---
app.UseAuthentication();
app.UseAuthorization();

// CORS: allow all (dev only)
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());

app.UseOpenApi(endpointName: "Genspire API", autoOpen: true);
app.MapAllOperations();
app.MapPost("/hello", (string name) => $"Hello {name}!");

app.Run();
