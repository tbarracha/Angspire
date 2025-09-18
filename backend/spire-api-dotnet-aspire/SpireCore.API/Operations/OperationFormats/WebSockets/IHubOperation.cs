// File: SpireCore.API.Operations.WebSockets/IHubOperation.cs
using System.Text.Json;

namespace SpireCore.API.Operations.WebSockets;

/// Realtime “vertical slice” contract. One per operation (chat, files, etc.)
public interface IHubOperation<TStart> where TStart : WsStartDto
{
    // Deserialize from the incoming Start payload
    TStart? Deserialize(JsonElement? payload);

    // Optional validation before a run
    Task<IReadOnlyList<string>> ValidateAsync(TStart start, CancellationToken ct);

    // The streaming body of the run (emit WsEnvelope frames)
    IAsyncEnumerable<WsEnvelope> OnStartedAsync(TStart start, string requestId, CancellationToken ct);

    // Policy knobs (default typical values)
    bool RequireAuth => true;
    bool AllowParallelStarts => false;
    TimeSpan StartCooldown => TimeSpan.FromMilliseconds(300);

    // Used for coalescing
    string? GetCoalesceKey(TStart start) =>
        !string.IsNullOrWhiteSpace(start.CoalesceKey) ? start.CoalesceKey : start.Route?.Trim().ToLowerInvariant();
}

/// <summary>
/// Optional contract that a Hub Operation can implement to advertise all WS routes it handles
/// (e.g., "session/connect", "session/chat/stream", "session/chat/stop").
/// </summary>
public interface IAdvertisesHubRoutes
{
    IReadOnlyCollection<string> Routes { get; }
}