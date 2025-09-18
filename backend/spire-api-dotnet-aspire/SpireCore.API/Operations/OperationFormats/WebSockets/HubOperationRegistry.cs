// File: SpireCore.API.Operations.WebSockets/HubOperationRegistry.cs
using System.Collections.Concurrent;

namespace SpireCore.API.Operations.WebSockets;

public interface IHubOperationRegistry
{
    void Register(string route, Func<IServiceProvider, object> factory, Type startType);
    bool TryResolve(string route, IServiceProvider sp, out object op, out Type startType);
}

public sealed class HubOperationRegistry : IHubOperationRegistry
{
    private readonly ConcurrentDictionary<string, (Func<IServiceProvider, object> factory, Type startType)> _map
        = new(StringComparer.OrdinalIgnoreCase);

    public void Register(string route, Func<IServiceProvider, object> factory, Type startType)
    {
        var key = Normalize(route);
        _map[key] = (factory, startType);
    }

    public bool TryResolve(string route, IServiceProvider sp, out object op, out Type startType)
    {
        var key = Normalize(route);
        if (_map.TryGetValue(key, out var e))
        {
            op = e.factory(sp);
            startType = e.startType;
            return true;
        }
        op = default!;
        startType = typeof(object);
        return false;
    }

    private static string Normalize(string route)
    {
        if (string.IsNullOrWhiteSpace(route)) return string.Empty;
        var r = route.Trim();

        // strip leading "/ws/" if present
        if (r.StartsWith("/ws/", StringComparison.OrdinalIgnoreCase))
            r = r.Substring(4);

        // strip any leading slash
        r = r.TrimStart('/');

        return r;
    }
}
