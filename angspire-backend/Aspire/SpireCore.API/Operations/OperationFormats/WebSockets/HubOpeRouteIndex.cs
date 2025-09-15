// File: SpireCore.API.Operations.WebSockets/HubOpRouteIndex.cs

using System.Collections.Concurrent;

namespace SpireCore.API.Operations.WebSockets;

/// <summary>
/// Route -> OperationType index (runtime-fed).
/// Used by the OperationsHub to resolve which hub operation handles a given route.
/// </summary>
public interface IHubOpRouteIndex
{
    /// <summary>Try to resolve a route to an operation type.</summary>
    bool TryGet(string route, out Type operationType);

    /// <summary>Add or override a route mapping.</summary>
    void Add(string route, Type operationType);

    /// <summary>Enumerates all known normalized routes.</summary>
    IEnumerable<string> Routes { get; }
}

public sealed class HubOpRouteIndex : IHubOpRouteIndex
{
    private readonly ConcurrentDictionary<string, Type> _map =
        new(StringComparer.OrdinalIgnoreCase);

    public IEnumerable<string> Routes => _map.Keys;

    public bool TryGet(string route, out Type operationType)
    {
        var key = Normalize(route);
        return _map.TryGetValue(key, out operationType!);
    }

    public void Add(string route, Type operationType)
    {
        if (string.IsNullOrWhiteSpace(route) || operationType is null) return;
        _map[Normalize(route)] = operationType;
    }

    private static string Normalize(string? route)
    {
        if (string.IsNullOrWhiteSpace(route)) return string.Empty;

        var r = route.Trim();

        // Strip leading "/ws/" if present
        if (r.StartsWith("/ws/", StringComparison.OrdinalIgnoreCase))
            r = r[4..];

        // Strip any leading slash
        return r.TrimStart('/');
    }
}
