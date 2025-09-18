// File: Genspire.Application.Modules.Agentic.Sessions/Contracts/Dtos/SessionRequestDto.cs

using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using SpireCore.API.Operations;

namespace Genspire.Application.Modules.Agentic.Sessions.Contracts.Dtos;

/// <summary>
/// Base for all session-related requests (storage-agnostic).
/// - If CreateNew==true, the server creates a Session first (ignores SessionId).
/// - If CreateNew==false and SessionId is set, the action applies to the existing Session.
/// - When TimelineId is null, the server uses the active timeline.
/// </summary>
public abstract class SessionRequestDto : IUserScopedRequest
{
    /// <summary>End user id (optional but recommended for multi-tenant).</summary>
    public string? UserId { get; set; }

    /// <summary>Target session. Omit/null when CreateNew==true.</summary>
    public Guid? SessionId { get; set; }

    /// <summary>Target timeline (optional). Defaults to the active timeline if null.</summary>
    public Guid? TimelineId { get; set; }

    /// <summary>If true, create a new session; SessionId should be null.</summary>
    public bool? CreateNew { get; set; }

    /// <summary>Optional session-level instructions (can be set/overridden per request).</summary>
    public string? Instructions { get; set; }

    /// <summary>Whether the created/updated session is temporary.</summary>
    public bool? IsTemporary { get; set; }

    /// <summary>Feature toggles that may affect server-side orchestration.</summary>
    public bool EnableThinking { get; set; } = false;
    public bool EnableWebSearch { get; set; } = false;

    /// <summary>Request-scoped metadata (not auto-persisted as entity metadata).</summary>
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>Optional client-generated id for idempotency/correlation.</summary>
    public string? ClientRequestId { get; set; }
}

/// <summary>
/// Assistant override options shared by chat/edit/regenerate.
/// Provider/Model may be omitted to reuse the session's defaults.
/// </summary>
public abstract class SessionAssistantRequestDto : SessionRequestDto
{
    /// <summary>Assistant provider (e.g., "openai"). If null/empty, use session default.</summary>
    public string? Provider { get; set; }

    /// <summary>Assistant model (e.g., "gpt-4o"). If null/empty, use session default.</summary>
    public string? Model { get; set; }

    /// <summary>Whether to stream partial deltas to the caller (if supported).</summary>
    public bool Stream { get; set; } = true;

    /// <summary>Per-call generation overrides (e.g., temperature, max tokens).</summary>
    public GenerationSettings? GenerationSettings { get; set; }
}

/// <summary>
/// Send a user chat message to a session (append a new turn on a timeline).
/// Server will create a new Session when CreateNew==true.
/// </summary>
public sealed class SessionChatRequestDto : SessionAssistantRequestDto
{
    /// <summary>
    /// Input message for this turn. Must be Role="user".
    /// Notes:
    /// - Server ignores auditing fields on the DTO (Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/StateFlag).
    /// - Server ignores SessionId/SessionTurnId on this DTO; routing is taken from the request envelope.
    /// </summary>
    public SessionMessageDto Input { get; set; } = new()
    {
        Role = AgenticRoles.USER,
        Content = new()
    };
}

/// <summary>
/// Edit the input message of an existing turn.
/// Creates a new input version, regenerates steps/output, and (if mid-timeline)
/// forks into a new timeline unless ForkTimeline is explicitly disabled.
/// </summary>
public sealed class SessionEditChatMessageRequestDto : SessionAssistantRequestDto
{
    /// <summary>The turn to edit (required).</summary>
    public Guid TurnId { get; set; }

    /// <summary>
    /// If set, the specific input message version being edited; otherwise the server
    /// will use the turn's SelectedInputIndex (current version).
    /// </summary>
    public Guid? InputMessageId { get; set; }

    /// <summary>
    /// The edited replacement input. Must be Role="user".
    /// Server ignores auditing fields and routing fields on the DTO (Id/CreatedAt/etc., SessionId, SessionTurnId).
    /// </summary>
    public SessionMessageDto NewInput { get; set; } = new()
    {
        Role = AgenticRoles.USER,
        Content = new()
    };

    /// <summary>
    /// Force whether to branch the timeline when editing a turn that is not last.
    /// null = server default (usually true).
    /// </summary>
    public bool? ForkTimeline { get; set; }
}

/// <summary>
/// Regenerate the output message for a turn (new execution).
/// Keeps the selected input version unless overridden.
/// </summary>
public sealed class SessionRegenerateChatMessageRequestDto : SessionAssistantRequestDto
{
    /// <summary>The turn to regenerate (required).</summary>
    public Guid TurnId { get; set; }

    /// <summary>
    /// Optional: regenerate relative to a specific output version; when null, server
    /// uses the turn's SelectedOutputIndex as the base (if applicable).
    /// </summary>
    public Guid? OutputMessageId { get; set; }

    /// <summary>
    /// If true (default), reuse the turn's currently selected input version.
    /// If false, the server will look at InputIndex below.
    /// </summary>
    public bool UseSelectedInput { get; set; } = true;

    /// <summary>
    /// Optional explicit input version index to use (0-based in InputMessageIds).
    /// Only used when UseSelectedInput == false.
    /// </summary>
    public int? InputIndex { get; set; }
}
