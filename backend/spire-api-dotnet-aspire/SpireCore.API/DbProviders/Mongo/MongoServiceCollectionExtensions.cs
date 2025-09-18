using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Bson.Serialization.Serializers;
using SpireCore.API.Configuration.Modules;
using System.Reflection;

namespace SpireCore.API.DbProviders.Mongo;

public sealed class MongoDbOptions
{
    /// <summary>Alias used to resolve the IMongoDatabase from IModuleDatabaseProvider.</summary>
    public string DatabaseAlias { get; set; } = "genspire_domain";

    /// <summary>Assemblies to scan for [MongoCollection]/[MongoIndex] attributes.</summary>
    public IEnumerable<Assembly> Assemblies { get; set; } = AppDomain.CurrentDomain.GetAssemblies();

    /// <summary>Register Guid/Guid? serializers as string.</summary>
    public bool UseGuidAsString { get; set; } = true;

    /// <summary>Register a global convention to store all enums as string.</summary>
    public bool UseEnumAsString { get; set; } = true;
}

public static class MongoDbServiceCollectionExtensions
{
    private static int _guidRegistered = 0;

    /// <summary>
    /// One-stop setup for Mongo:
    /// - Guid as string
    /// - Enums as string (convention)
    /// - ModuleDatabaseProvider
    /// - Attribute-based index creation on startup
    /// </summary>
    public static IServiceCollection AddMongoDb(
        this IServiceCollection services,
        IConfiguration configuration,
        Action<MongoDbOptions>? configure = null)
    {
        var options = new MongoDbOptions();
        configure?.Invoke(options);

        // 1) Global BSON setup (idempotent)
        if (options.UseGuidAsString && Interlocked.Exchange(ref _guidRegistered, 1) == 0)
        {
            BsonSerializer.RegisterSerializer(typeof(Guid), new GuidSerializer(BsonType.String));
            BsonSerializer.RegisterSerializer(typeof(Guid?), new NullableSerializer<Guid>(new GuidSerializer(BsonType.String)));
        }

        if (options.UseEnumAsString)
            MongoConventions.RegisterEnumAsString();

        // 2) Database provider (reads from IConfiguration)
        services.TryAddSingleton<IModuleDatabaseProvider, ModuleDatabaseProvider>();

        // 3) Index ensure hosted service
        services.AddHostedService(sp => new MongoIndexHostedService(
            provider: sp.GetRequiredService<IModuleDatabaseProvider>(),
            logger: sp.GetService<ILogger<MongoIndexHostedService>>(),
            databaseAlias: options.DatabaseAlias,
            assemblies: options.Assemblies));

        return services;
    }

    /// <summary>
    /// Overload for convenience when you want to pass assemblies inline.
    /// </summary>
    public static IServiceCollection AddMongoDb(
        this IServiceCollection services,
        IConfiguration configuration,
        IEnumerable<Assembly> assemblies,
        string databaseAlias = "genspire_domain")
        => services.AddMongoDb(configuration, opts =>
        {
            opts.Assemblies = assemblies;
            opts.DatabaseAlias = databaseAlias;
        });
}

internal static class MongoConventions
{
    private static int _enumConvRegistered = 0;

    public static void RegisterEnumAsString()
    {
        if (Interlocked.Exchange(ref _enumConvRegistered, 1) == 1) return;

        var pack = new ConventionPack
        {
            new EnumRepresentationConvention(BsonType.String)
        };
        ConventionRegistry.Register("EnumAsString", pack, _ => true);
    }
}

internal sealed class MongoIndexHostedService : IHostedService
{
    private readonly IModuleDatabaseProvider _provider;
    private readonly ILogger<MongoIndexHostedService>? _logger;
    private readonly string _databaseAlias;
    private readonly IEnumerable<Assembly> _assemblies;

    public MongoIndexHostedService(
        IModuleDatabaseProvider provider,
        ILogger<MongoIndexHostedService>? logger,
        string databaseAlias,
        IEnumerable<Assembly> assemblies)
    {
        _provider = provider;
        _logger = logger;
        _databaseAlias = databaseAlias;
        _assemblies = assemblies;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var db = _provider.GetMongoDatabase(_databaseAlias);
        _logger?.LogInformation("Ensuring Mongo indexes for alias '{Alias}' across {Count} assemblies...",
            _databaseAlias, _assemblies.Count());

        await MongoIndexInitializer.EnsureIndexesAsync(db, _assemblies, ct: cancellationToken);

        _logger?.LogInformation("Mongo index ensure completed for alias '{Alias}'.", _databaseAlias);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
