using SpireCore.Services;

namespace SpireCore.Files.Storage;

public interface IFileStorageFactory
{
    IFileStorageService Get(string providerKey);         // e.g., "local", "s3"
    IFileStorageService ForContainer(string container);  // optional routing by container
}

// Optional config-driven routing (super simple)
public sealed class FileStorageRoutingOptions
{
    /// Default provider key when no route matches. e.g., "local".
    public string DefaultProvider { get; set; } = "local";

    /// Map container name -> provider key. Example: { "assets": "s3", "temp": "local" }
    public Dictionary<string, string> ContainerMap { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

// ===========================
// 2) Factory (reads all providers from DI)
// ===========================
public sealed class FileStorageFactory : IFileStorageFactory, ISingletonService
{
    private readonly Dictionary<string, IFileStorageService> _byKey;
    private readonly FileStorageRoutingOptions _routing;

    public FileStorageFactory(IEnumerable<IFileStorageService> providers, FileStorageRoutingOptions routing)
    {
        _routing = routing ?? new FileStorageRoutingOptions();
        _routing.ContainerMap ??= new(StringComparer.OrdinalIgnoreCase);

        _byKey = (providers ?? throw new ArgumentNullException(nameof(providers)))
            .ToDictionary(p => p.ProviderKey, p => p, StringComparer.OrdinalIgnoreCase);

        if (_byKey.Count == 0)
            throw new InvalidOperationException("No IFileStorageService providers are registered.");

        if (!_byKey.ContainsKey(_routing.DefaultProvider))
            throw new InvalidOperationException(
                $"Default provider '{_routing.DefaultProvider}' is not registered. Registered: {string.Join(", ", _byKey.Keys)}");
    }

    public IFileStorageService Get(string providerKey)
    {
        if (_byKey.TryGetValue(providerKey, out var svc)) return svc;
        throw new KeyNotFoundException(
            $"File storage provider '{providerKey}' not found. Registered: {string.Join(", ", _byKey.Keys)}");
    }

    public bool TryGet(string providerKey, out IFileStorageService storage)
        => _byKey.TryGetValue(providerKey, out storage!);

    public IFileStorageService ForContainer(string container)
    {
        if (!string.IsNullOrWhiteSpace(container)
            && _routing.ContainerMap.TryGetValue(container, out var key)
            && _byKey.TryGetValue(key, out var svc))
        {
            return svc;
        }

        return _byKey[_routing.DefaultProvider];
    }
}
