// SessionChatCancelOperation.cs
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;
public sealed class SessionChatCancelRequestDto : ICancelStreamRequest
{
    /// <summary>
    /// The requestId of the running stream to cancel.
    /// You get this from the first frame (Sequence=0) of the stream.
    /// </summary>
    public string? RequestId { get; set; }
    // (Optional) add anything you want to authorize (e.g., UserId, SessionId)
    public Guid? SessionId { get; set; }
}

public sealed class SessionChatCancelResponseDto : ICancelStreamResponse
{
    public bool Success { get; set; }
}

/// <summary>
/// Cancels an in-flight session chat stream given its requestId.
/// </summary>
[OperationRoute("session/chat/cancel")]
public sealed class SessionChatCancelOperation : CancelStreamOperationBase<SessionChatCancelRequestDto, SessionChatCancelResponseDto>
{
    // Inject repos/services if you want to authorize against SessionId/UserId
    public SessionChatCancelOperation(IStreamAbortRegistry registry) : base(registry)
    {
    }

    // Optional: gate cancel by your own rules (user owns the session, etc.)
    protected override Task<bool> AuthorizeAsync(SessionChatCancelRequestDto request, CancellationToken ct = default)
    {
        // Example (pseudo):
        // if (request.SessionId is null) return Task.FromResult(false);
        // return _sessionAuth.CanCurrentUserCancel(request.SessionId.Value);
        return Task.FromResult(true);
    }
    // Optional: customize how requestId is resolved (defaults to request.RequestId?.Trim())
    // protected override string? ResolveRequestId(SessionChatCancelRequestDto request)
    //     => base.ResolveRequestId(request);
}