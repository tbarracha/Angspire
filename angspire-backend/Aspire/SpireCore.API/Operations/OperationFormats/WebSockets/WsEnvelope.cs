// File: SpireCore/API/Operations/WebSockets/WsEnvelope.cs
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SpireCore.API.Operations.WebSockets;

public class WsStartDto : IUserScopedRequest
{
    public required string Route { get; set; }
    public string? UserId { get; set; }
    public string? AuthToken { get; set; }
    public string? CoalesceKey { get; set; }
}

public sealed class RescopeRequest
{
    public string? RequestId { get; set; }   // optional correlation
    public string? Group { get; set; }       // e.g. "session:{id}"
    public string? SessionId { get; set; }   // alternative: will map to "session:{id}"
}

/// <summary>
/// Single envelope used for both client>server and server>client messages.
/// </summary>
public sealed class WsEnvelope
{
    public string? Type { get; set; }

    // Correlation from client to server (or server to client)
    public string? RequestId { get; set; }

    // Start / message payload (raw to avoid extra (de)serializations)
    public JsonElement? Payload { get; set; }

    // Bearer token, either inline or filled from header by the server
    public string? AuthToken { get; set; }

    // Optional client-side correlation
    public string? ClientRequestId { get; set; }
    public bool? Close { get; set; }

    // Anything else we don't explicitly model gets preserved here
    [JsonExtensionData]
    public Dictionary<string, JsonElement>? ExtensionData { get; set; }
}

public static class WsEnvelopeBuilder
{
    public static WsEnvelope Event(string type, object? payload = null, string? requestId = null, bool? close = null)
        => new WsEnvelope
        {
            Type = type,
            Payload = payload is null ? null : JsonSerializer.SerializeToElement(payload),
            RequestId = requestId,
            Close = close                                  // ⬅️ set it
        };

    public static WsEnvelope Acknowledge(string? requestId = null)
        => Event("ack", null, requestId);

    // Backwards-compat alias (if existing code calls Ack)
    public static WsEnvelope Ack(string? requestId = null)
        => Acknowledge(requestId);

    public static WsEnvelope Error(string code, string message, object? data = null, string? requestId = null)
        => Event("error", new { code, message, data }, requestId);

    public static WsEnvelope Finished(string? requestId = null, string reason = "completed", bool close = true)
        => Event("finished", new { reason }, requestId, close);
}
