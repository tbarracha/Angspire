// File: SpireCore/API/Operations/Streaming/InMemoryStreamAbortRegistry.cs
using SpireCore.Services;
using System.Collections.Concurrent;

namespace SpireCore.API.Operations.Streaming;

public sealed class InMemoryStreamAbortRegistry : IStreamAbortRegistry, ISingletonService
{
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _map = new(StringComparer.Ordinal);

    public int Count => _map.Count;

    public bool TryRegister(string requestId, CancellationTokenSource cts)
    {
        if (string.IsNullOrWhiteSpace(requestId) || cts is null)
            return false;

        // Prevent accidental overwrite; caller should Remove previous if reusing id
        return _map.TryAdd(requestId, cts);
    }

    public bool Cancel(string requestId)
    {
        if (string.IsNullOrWhiteSpace(requestId)) return false;

        if (_map.TryRemove(requestId, out var cts))
        {
            return TryCancelAndDispose(cts);
        }

        return false; // not registered (already removed/cancelled)
    }

    public void Remove(string requestId)
    {
        if (string.IsNullOrWhiteSpace(requestId)) return;

        if (_map.TryRemove(requestId, out var cts))
        {
            // Remove without cancel (e.g., natural completion) → still dispose the CTS
            TryDispose(cts);
        }
    }

    public bool IsRegistered(string requestId)
        => !string.IsNullOrWhiteSpace(requestId) && _map.ContainsKey(requestId);

    private static bool TryCancelAndDispose(CancellationTokenSource cts)
    {
        try
        {
            try { cts.Cancel(); } catch { /* ignore */ }
            TryDispose(cts);
            return true;
        }
        catch
        {
            // if disposal throws, treat as cancelled enough not to leak
            return false;
        }
    }

    private static void TryDispose(CancellationTokenSource cts)
    {
        try { cts.Dispose(); } catch { /* ignore */ }
    }
}
