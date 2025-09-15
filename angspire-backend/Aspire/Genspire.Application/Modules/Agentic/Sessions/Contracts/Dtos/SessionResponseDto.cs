using System.Text.Json.Serialization;
using SpireCore.API.Operations.Streaming;

namespace Genspire.Application.Modules.Agentic.Sessions.Contracts.Dtos;

/* ============================================================
 *  Operation kinds (align with request types)
 * ============================================================ */
public enum SessionOperationKind
{
    Chat,           // SessionChatRequestDto
    EditInput,      // SessionEditChatMessageRequestDto
    Regenerate      // SessionRegenerateChatMessageRequestDto
}

/* ============================================================
 *  COMMON BASE (shared by stream + non-stream)
 * ============================================================ */
public abstract class SessionEventBaseDto : IStreamedDto
{
    // Correlation
    public string? RequestId { get; set; } = string.Empty;
    public string? ClientRequestId { get; set; }

    // Operation context
    public SessionOperationKind Operation { get; set; }

    // Routing (nullable to allow early frames)
    public Guid? SessionId { get; set; }
    public Guid? TimelineId { get; set; }
    public Guid? TurnId { get; set; }
    public Guid? ExecutionId { get; set; }

    // Optional summary info (counts, cost, etc.)
    public SessionStatsDto? Stats { get; set; }

    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
    public bool IsFinished { get; set; }
    public string? FinishReason { get; set; }
    public int? Sequence { get; set; }

    // Optional adhoc data per frame
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, object>? Metadata { get; set; }
}

/* ============================================================
 *  STREAMING BASE (adds sequence, finality, timestamp)
 *  Streaming events inherit from this (not from the non-stream base).
 * ============================================================ */
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(AckEventDto), "ack")]
[JsonDerivedType(typeof(TurnCreatedEventDto), "turn_created")]
[JsonDerivedType(typeof(InputCommittedEventDto), "input_committed")]
[JsonDerivedType(typeof(ExecutionBeganEventDto), "execution_began")]
[JsonDerivedType(typeof(TimelineForkedEventDto), "timeline_forked")]
[JsonDerivedType(typeof(StepAppendedEventDto), "step_appended")]
[JsonDerivedType(typeof(OutputDeltaEventDto), "output_delta")]
[JsonDerivedType(typeof(OutputCommittedEventDto), "output_committed")]
[JsonDerivedType(typeof(SelectionUpdatedEventDto), "selection_updated")]
[JsonDerivedType(typeof(CompletedEventDto), "completed")]
[JsonDerivedType(typeof(ErrorEventDto), "error")]
public class SessionStreamEventDto : SessionEventBaseDto
{
}

/* ============================================================
 *  STREAMING EVENT DTOS (multiple concrete types)
 * ============================================================ */
public sealed class AckEventDto : SessionStreamEventDto
{
    public string? Provider { get; set; }
    public string? Model { get; set; }
    public bool SessionCreated { get; set; }
    public Guid? InputMessageId { get; set; }
    public Guid? OutputMessageId { get; set; }
}

public sealed class TurnCreatedEventDto : SessionStreamEventDto
{
    public int TimelineIndex { get; set; }
}

public sealed class InputCommittedEventDto : SessionStreamEventDto
{
    public Guid InputMessageId { get; set; }
    public SessionMessageDto? Input { get; set; }  // optional echo
}

public sealed class ExecutionBeganEventDto : SessionStreamEventDto
{
    public int UsingInputIndex { get; set; }
}

public sealed class TimelineForkedEventDto : SessionStreamEventDto
{
    public Guid BaseTimelineId { get; set; }
    public Guid NewTimelineId { get; set; }
    public int? DivergenceTurnIndex { get; set; }
}

public sealed class StepAppendedEventDto : SessionStreamEventDto
{
    public TurnStepDto Step { get; set; } = new();
}

public sealed class OutputDeltaEventDto : SessionStreamEventDto
{
    public string TextDelta { get; set; } = string.Empty;
    public int? CumulativeChars { get; set; }
    public int? CumulativeTokens { get; set; }
}

public sealed class OutputCommittedEventDto : SessionStreamEventDto
{
    public Guid OutputMessageId { get; set; }
    public SessionMessageDto Output { get; set; } = new();
}

public sealed class SelectionUpdatedEventDto : SessionStreamEventDto
{
    public int SelectedInputIndex { get; set; }
    public int SelectedOutputIndex { get; set; }
}

public sealed class CompletedEventDto : SessionStreamEventDto
{
    public Guid? NewTimelineId { get; set; }
    public Guid? InputMessageId { get; set; }
    public Guid? OutputMessageId { get; set; }
    public List<Guid>? StepIds { get; set; }

    // Optional final snapshots
    public SessionTurnDto? Turn { get; set; }
    public SessionStatsDto? FinalStats { get; set; }   // alias if you prefer not to reuse base.Stats
}

public sealed class ErrorEventDto : SessionStreamEventDto
{
    public string Code { get; set; } = "unknown_error";
    public string Message { get; set; } = "Unhandled error.";
    public Dictionary<string, object>? Details { get; set; }
}

/* ============================================================
 *  NON-STREAM (collapsed) RESPONSES
 *  - Also inherit from the SAME base to unify metadata.
 *  - These mirror the three request types and represent final snapshots.
 * ============================================================ */
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(SessionChatResponseDto), "chat_response")]
[JsonDerivedType(typeof(SessionEditChatMessageResponseDto), "edit_input_response")]
[JsonDerivedType(typeof(SessionRegenerateChatMessageResponseDto), "regenerate_response")]
public class SessionOperationResponseDto : SessionEventBaseDto
{
}

public sealed class SessionChatResponseDto : SessionOperationResponseDto
{
    public Guid InputMessageId { get; set; }
    public Guid OutputMessageId { get; set; }

    public SessionMessageDto Output { get; set; } = new();
    public List<TurnStepDto> Steps { get; set; } = new();
}

public sealed class SessionEditChatMessageResponseDto : SessionOperationResponseDto
{
    /// <summary>If a fork occurred, this is the new active timeline; otherwise equals TimelineId.</summary>
    public Guid NewTimelineId { get; set; }

    public Guid InputMessageId { get; set; }
    public Guid OutputMessageId { get; set; }

    public SessionMessageDto Output { get; set; } = new();
    public List<TurnStepDto> Steps { get; set; } = new();
}

public sealed class SessionRegenerateChatMessageResponseDto : SessionOperationResponseDto
{
    public Guid OutputMessageId { get; set; }

    public SessionMessageDto Output { get; set; } = new();
    public List<TurnStepDto> Steps { get; set; } = new();
}
