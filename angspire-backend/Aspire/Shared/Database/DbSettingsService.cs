using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;

namespace Shared.Database;

public interface IDbSettingsService
{
    string ProfileName { get; }
    DbProfileSettings Profile { get; }
    bool TryGetProfile(string name, out DbProfileSettings? profile);
    void SwitchProfile(string name);
}

public sealed class DbSettingsService : IDbSettingsService, IDisposable
{
    private readonly IConfiguration _config;
    private readonly IDisposable? _reloadReg;
    private readonly object _lock = new();

    private string _profileName = "dev";
    private Dictionary<string, DbProfileSettings> _profiles = new(StringComparer.OrdinalIgnoreCase);

    public DbSettingsService(IConfiguration config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        Load(); // initial
        _reloadReg = ChangeToken.OnChange(_config.GetReloadToken, LoadSafe);
    }

    public string ProfileName => _profileName;

    public DbProfileSettings Profile
    {
        get
        {
            lock (_lock)
            {
                if (!_profiles.TryGetValue(_profileName, out var p) || p is null)
                    throw new InvalidOperationException($"DbSettings profile '{_profileName}' not found");
                return p;
            }
        }
    }

    public bool TryGetProfile(string name, out DbProfileSettings? profile)
    {
        lock (_lock)
        {
            var ok = _profiles.TryGetValue(name, out var p);
            profile = p;
            return ok;
        }
    }

    public void SwitchProfile(string name)
    {
        lock (_lock)
        {
            if (!_profiles.ContainsKey(name))
                throw new InvalidOperationException($"DbSettings profile '{name}' not found");
            _profileName = name;
        }
    }

    private void LoadSafe() { try { Load(); } catch { /* keep last good */ } }

    private void Load()
    {
        var section = _config.GetSection("DbSettings");
        if (!section.Exists())
            throw new InvalidOperationException("DbSettings section missing in configuration.");

        // Bind simple root settings first
        var root = new DbSettings();
        section.Bind(root);
        if (string.IsNullOrWhiteSpace(root.Profile))
            root.Profile = "dev";

        // Bind Profiles dictionary explicitly to avoid partial binds
        var profilesSection = section.GetSection("Profiles");
        var boundProfiles = profilesSection.Get<Dictionary<string, DbProfileSettings>>()
                            ?? new Dictionary<string, DbProfileSettings>(StringComparer.OrdinalIgnoreCase);

        // Normalize into case-insensitive dict and fix nested/nulls
        var dict = new Dictionary<string, DbProfileSettings>(StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in boundProfiles)
        {
            var p = kvp.Value ?? new DbProfileSettings();

            p.Auth ??= new SqlEndpoint();
            p.Domain ??= new NoSqlEndpoint();
            p.Vectors ??= new VectorEndpoint();
            p.FileStorage ??= new FileStorageEndpoint();

            // Normalize nested S3 block into top-level fields if present
            p.FileStorage.NormalizeS3();

            dict[kvp.Key] = p;
        }

        // Validate selected profile exists; show discovered keys to aid debugging
        if (!dict.ContainsKey(root.Profile))
        {
            var keys = dict.Keys.Any() ? string.Join(", ", dict.Keys) : "(none)";
            throw new InvalidOperationException($"DbSettings selected Profile '{root.Profile}' not found under DbSettings:Profiles. Available: {keys}");
        }

        lock (_lock)
        {
            _profileName = root.Profile;
            _profiles = dict;
        }
    }

    public void Dispose() => _reloadReg?.Dispose();
}
