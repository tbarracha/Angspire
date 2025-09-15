using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using SpireCore.Services;

namespace SpireCore.API.Configuration.Modules
{
    public interface IModuleDatabaseProvider
    {
        IMongoDatabase GetMongoDatabase(string moduleName);
    }

    /// <summary>
    /// Reads Mongo database from IConfiguration (DbSettings:Profiles:{Profile}:Domain).
    /// Registers aliases: "Domain", "GenspireModules", and "genspire_domain".
    /// </summary>
    public class ModuleDatabaseProvider : IModuleDatabaseProvider, ISingletonService
    {
        private readonly Dictionary<string, IMongoDatabase> _mongoDbs;

        public ModuleDatabaseProvider(IConfiguration configuration)
        {
            _mongoDbs = new Dictionary<string, IMongoDatabase>(StringComparer.OrdinalIgnoreCase);

            // Resolve profile: allow dev/local/remote (case-insensitive)
            var profile = configuration["DbSettings:Profile"] ?? "local";
            var profileRoot = configuration.GetSection($"DbSettings:Profiles:{profile}");
            if (!profileRoot.Exists()) return;

            var domain = profileRoot.GetSection("Domain");
            if (!domain.Exists()) return;

            var provider = domain["Provider"] ?? string.Empty;
            var isMongo = provider.Equals("Mongo", StringComparison.OrdinalIgnoreCase)
                       || provider.Equals("MongoDb", StringComparison.OrdinalIgnoreCase);
            if (!isMongo) return;

            var conn = domain["ConnectionString"];
            if (string.IsNullOrWhiteSpace(conn)) return;

            var client = new MongoClient(conn);

            var dbName = domain["Database"];
            if (string.IsNullOrWhiteSpace(dbName))
            {
                var urlDb = new MongoUrl(conn).DatabaseName;
                dbName = string.IsNullOrWhiteSpace(urlDb) ? "Domain" : urlDb;
            }

            var db = client.GetDatabase(dbName);

            // Canonical + aliases
            _mongoDbs["Domain"] = db;
            _mongoDbs["GenspireModules"] = db;
            _mongoDbs["genspire_domain"] = db; // your chosen key everywhere
        }

        public IMongoDatabase GetMongoDatabase(string moduleName)
        {
            if (!_mongoDbs.TryGetValue(moduleName, out var db))
                throw new InvalidOperationException($"Module '{moduleName}' is not configured for Mongo.");
            return db;
        }
    }
}
