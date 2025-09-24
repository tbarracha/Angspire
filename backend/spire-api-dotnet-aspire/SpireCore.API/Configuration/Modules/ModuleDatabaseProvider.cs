using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using SpireCore.Services;

namespace SpireCore.API.Configuration.Modules;

public interface IModuleDatabaseProvider
{
    IMongoDatabase GetMongoDatabase(string moduleName);
}

/// <summary>
/// Identity-agnostic Mongo resolver.
/// - Reads ServiceIdentity:ServiceName to derive an identity slug (e.g., "Angspire API" -> "angspire") and PascalName ("Angspire").
/// - Selects DbSettings profile by priority: DB_PROFILE env -> DbSettings:Profile -> first existing among [slug, slug-dev, slug_dev, hostdev].
/// - Resolves Domain connection (MongoDb only).
/// - Defaults Domain:Database to "<slug>_domain" if missing.
/// - Registers aliases: "Domain", "<PascalName>Modules", the configured DB name, plus slug variants
///   (<slug>_domain | <slug>-domain | <slug>.domain | <slug>_modules | <slug>-modules | <slug>.modules)
///   and Domain:Aliases if provided.
/// </summary>
public class ModuleDatabaseProvider : IModuleDatabaseProvider, ISingletonService
{
    private readonly Dictionary<string, IMongoDatabase> _mongoDbs;

    public ModuleDatabaseProvider(IConfiguration configuration)
    {
        _mongoDbs = new Dictionary<string, IMongoDatabase>(StringComparer.OrdinalIgnoreCase);

        // --- 1) Identity -> slug + PascalName
        var serviceName = configuration["ServiceIdentity:ServiceName"] ??
                          AppDomain.CurrentDomain.FriendlyName ??
                          "App";
        var slug = Slugify(serviceName);        // e.g., "angspire-api" -> "angspire-api"
        slug = TrimCommonSuffix(slug);      // drop "-api", "-service", "-app", etc. => "angspire"
        var pascalName = Pascalize(serviceName);      // "AngspireApi" -> we still register "AngspireModules"

        // --- 2) Resolve effective profile
        var configuredProfile = configuration["DbSettings:Profile"];
        var envProfile = Environment.GetEnvironmentVariable("DB_PROFILE");
        var fallbackCandidates = new[]
        {
            slug,
            $"{slug}-dev",
            $"{slug}_dev",
            "hostdev"
        };

        var profile = FirstExistingProfile(configuration, envProfile, configuredProfile, fallbackCandidates);
        var profileRoot = configuration.GetSection($"DbSettings:Profiles:{profile}");
        if (!profileRoot.Exists()) return;

        var domain = profileRoot.GetSection("Domain");
        if (!domain.Exists()) return;

        // --- 3) Only handle Mongo
        var provider = domain["Provider"] ?? string.Empty;
        var isMongo = provider.Equals("Mongo", StringComparison.OrdinalIgnoreCase)
                   || provider.Equals("MongoDb", StringComparison.OrdinalIgnoreCase);
        if (!isMongo) return;

        var conn = domain["ConnectionString"];
        if (string.IsNullOrWhiteSpace(conn)) return;

        var client = new MongoClient(conn);

        // --- 4) Determine DB name (default to "<slug>_domain")
        var dbName = domain["Database"];
        if (string.IsNullOrWhiteSpace(dbName))
        {
            var urlDb = new MongoUrl(conn).DatabaseName;
            dbName = string.IsNullOrWhiteSpace(urlDb) ? $"{slug}_domain" : urlDb;
        }

        var db = client.GetDatabase(dbName);

        // --- 5) Register aliases
        AddAlias("Domain", db);
        AddAlias($"{pascalName}Modules", db); // e.g., AngspireModules
        AddAlias(dbName, db);                 // configured db (e.g., angspire_domain)

        // slug variants: domain + modules
        AddAlias($"{slug}_domain", db);
        AddAlias($"{slug}-domain", db);
        AddAlias($"{slug}.domain", db);
        AddAlias($"{slug}_modules", db);
        AddAlias($"{slug}-modules", db);
        AddAlias($"{slug}.modules", db);

        // user-provided alias list
        var extraAliases = domain.GetSection("Aliases").Get<string[]>() ?? Array.Empty<string>();
        foreach (var alias in extraAliases.Where(a => !string.IsNullOrWhiteSpace(a)))
            AddAlias(alias!, db);
    }

    public IMongoDatabase GetMongoDatabase(string moduleName)
    {
        if (!_mongoDbs.TryGetValue(moduleName, out var db))
            throw new InvalidOperationException($"Module '{moduleName}' is not configured for Mongo.");
        return db;
    }

    private void AddAlias(string key, IMongoDatabase db) => _mongoDbs[key] = db;

    private static string FirstExistingProfile(
        IConfiguration cfg,
        string? envProfile,
        string? configuredProfile,
        IEnumerable<string> candidates)
    {
        if (!string.IsNullOrWhiteSpace(envProfile) && cfg.GetSection($"DbSettings:Profiles:{envProfile}").Exists())
            return envProfile;

        if (!string.IsNullOrWhiteSpace(configuredProfile) && cfg.GetSection($"DbSettings:Profiles:{configuredProfile}").Exists())
            return configuredProfile;

        foreach (var c in candidates)
            if (cfg.GetSection($"DbSettings:Profiles:{c}").Exists())
                return c;

        // Fallback to "hostdev" even if missing, to preserve previous behavior
        return configuredProfile ?? envProfile ?? "hostdev";
    }

    // --- helpers: identity normalization ---
    private static string Slugify(string input)
    {
        // Lower + replace non-alnum with '-'
        var lower = input.Trim().ToLowerInvariant();
        var replaced = Regex.Replace(lower, @"[^a-z0-9]+", "-");
        // collapse dashes
        replaced = Regex.Replace(replaced, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(replaced) ? "app" : replaced;
    }

    private static string TrimCommonSuffix(string slug)
    {
        // remove common trailing tokens once (api, service, app, server, backend, web)
        var tokens = slug.Split('-', StringSplitOptions.RemoveEmptyEntries).ToList();
        if (tokens.Count == 0) return slug;
        var last = tokens[^1];
        var toDrop = new HashSet<string> { "api", "service", "app", "server", "backend", "web" };
        if (toDrop.Contains(last))
        {
            tokens.RemoveAt(tokens.Count - 1);
            if (tokens.Count == 0) return slug; // keep original if it would be empty
            return string.Join('-', tokens);
        }
        return slug;
    }

    private static string Pascalize(string input)
    {
        // Keep only letters/digits, capitalize words
        var cleaned = Regex.Replace(input, @"[^A-Za-z0-9]+", " ");
        var ti = CultureInfo.InvariantCulture.TextInfo;
        var words = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                           .Select(w => ti.ToTitleCase(w.ToLowerInvariant()));
        return string.Concat(words);
    }
}
