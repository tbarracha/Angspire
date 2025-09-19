// File: Genspire.Application.Modules.Agentic.Sessions/Contracts/SessionDomainDtos.cs

using System.Text.Json.Serialization;
using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using SpireCore.Abstractions.Interfaces;
using SpireCore.API.Contracts.Entities.Dtos;

namespace Genspire.Application.Modules.Agentic.Sessions.Contracts;

/* =========================
 * Session + linked types
 * ========================= */
public sealed class SessionDto : AuditableDto, ILastActivityAt
{
    public string? UserId { get; set; }
    public string? Name { get; set; }
    public string? Instructions { get; set; }
    public bool IsTemporary { get; set; }
    public DateTime LastActivityAt { get; set; }

    // Refs
    public Guid? SessionSettingsId { get; set; }
    public Guid? SessionTypeId { get; set; }
    public Guid? SessionTimelineId { get; set; } // active
    public Guid? SessionStatsId { get; set; }

    // Optional hydration
    public SessionSettingsDto? Settings { get; set; }
    public SessionTypeDto? SessionType { get; set; }
    public SessionTimelineDto? SessionTimeline { get; set; }
    public SessionStatsDto? SessionStats { get; set; }
}

public sealed class SessionTypeDto : AuditableDto
{
    public string Name { get; set; } = string.Empty; // chat, tool, workflow, etc
    public string? Description { get; set; }
    public bool IsSystemType { get; set; } = true;
    public bool IsDefault { get; set; }
}

public sealed class SessionSettingsDto : AuditableDto
{
    public GenerationSettings GenerationSettings { get; set; } = new();
    public bool IsDefault { get; set; }
}

public sealed class SessionStatsDto : AuditableDto
{
    public int TotalTimelines { get; set; }
    public int TotalTurns { get; set; }
    public int TotalMessages { get; set; }
    public long TotalInputTokens { get; set; }
    public long TotalOutputTokens { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime? LastComputedAt { get; set; }
}

// ---- Base scope for timeline-scoped DTOs (optional, but keeps shape consistent)
public abstract class SessionTimelineScopedDto : AuditableDto
{
    public Guid SessionId { get; set; }
    public Guid TimelineId { get; set; }
    public List<Guid> TurnIds { get; set; } = new();
}

/* =========================
 * SessionHistory DTO
 * ========================= */
public sealed class SessionHistoryDto : SessionTimelineScopedDto
{
    public int TotalTurns { get; set; }
    public int TotalMessages { get; set; }
    public int WindowTurns { get; set; }

    public Guid? LatestSessionSummaryId { get; set; }
    public List<Guid> SessionSummaryIds { get; set; } = new();

    public List<string> Providers { get; set; } = new(); // flattened sets for the wire
    public List<string> Models { get; set; } = new();

    public int MaxWindowTurns { get; set; } = 16;
    public int SummarizeEveryNMessages { get; set; } = 40;
    public int MaxSummaryTokens { get; set; } = 2048;
    public bool EnableCompaction { get; set; } = true;

    public int LastProcessedTurnIndex { get; set; } = -1;
    public Guid? LastProcessedTurnId { get; set; }

    public DateTime? LastSummarizedAt { get; set; }
    public DateTime? LastCompactedAt { get; set; }
}

/* =========================
 * SessionSummary DTO
 * ========================= */
public sealed class SessionSummaryDto : SessionTimelineScopedDto
{
    public int FromTurnIndex { get; set; } = 0;
    public int ToTurnIndex { get; set; } = -1;
    public int TurnCount { get; set; } = 0;

    // Provenance
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;

    public GenerationSettings? Settings { get; set; }
    public Dictionary<string, object>? Usage { get; set; }
    public decimal? Cost { get; set; }

    public string Summary { get; set; } = string.Empty;
    public DateTime SummarizedAt { get; set; }
}

/* =========================
 * SessionTurnSummary DTO
 * ========================= */
public sealed class SessionTurnSummaryDto : SessionTimelineScopedDto
{
    public Guid SessionTurnId { get; set; }
    public int TurnIndex { get; set; } = 0;

    // Provenance
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;

    public GenerationSettings? Settings { get; set; }
    public Dictionary<string, object>? Usage { get; set; }
    public decimal? Cost { get; set; }

    public string Summary { get; set; } = string.Empty;
    public DateTime SummarizedAt { get; set; }
}

/* =========================
 * Timeline
 * ========================= */
public sealed class SessionTimelineDto : AuditableDto
{
    public Guid SessionId { get; set; }
    public int Index { get; set; }

    public string? Summary { get; set; }
    public string? Description { get; set; }

    public bool IsDefault { get; set; }
    public bool IsAppendOnly { get; set; } = true;

    public Guid? PreviousTimelineId { get; set; }
    public int? DivergenceTurnIndex { get; set; }

    public List<Guid> SessionTurnIds { get; set; } = new();

    // Optional hydration
    public List<SessionTurnDto>? SessionTurns { get; set; }
}

/* =========================
 * Turn
 * ========================= */
public sealed class SessionTurnDto : AuditableDto
{
    public Guid SessionId { get; set; }
    public Guid? PreviousTurnId { get; set; }
    public Guid? TimelineId { get; set; }
    public int TimelineIndex { get; set; }

    public List<Guid> InputMessageIds { get; set; } = new();
    public List<Guid> OutputMessageIds { get; set; } = new();
    public List<Guid> StepIds { get; set; } = new();

    public Guid CurrentExecutionId { get; set; } = Guid.Empty;
    public int SelectedInputIndex { get; set; } = -1;
    public int SelectedOutputIndex { get; set; } = -1;

    // Optional hydration
    public List<SessionMessageDto>? InputMessages { get; set; }
    public List<SessionMessageDto>? OutputMessages { get; set; }
    public List<TurnStepDto>? Steps { get; set; }
}

/* =========================
 * Turn Steps
 * ========================= */
public sealed class TurnStepDto : AuditableDto
{
    public Guid SessionTurnId { get; set; }
    public Guid? ExecutionId { get; set; }
    public int Index { get; set; }
    public Guid? PreviousStepId { get; set; }

    public string Kind { get; set; } = TurnStepKinds.ToolCall;
    public object? Payload { get; set; }
    public string? CorrelationId { get; set; }
}

/* =========================
 * Messages (hydrated)
 * ========================= */
public sealed class SessionMessageDto : AuditableDto
{
    public Guid? SessionId { get; set; }
    public Guid? SessionTurnId { get; set; }
    public Guid? ParentMessageId { get; set; }

    /// <summary>"user" or "assistant"</summary>
    public string Role { get; set; } = AgenticRoles.USER;

    public List<SessionMessageContentDto> Content { get; set; } = new();

    // Assistant metadata
    public string? Provider { get; set; }
    public string? Model { get; set; }
    public GenerationSettings? Settings { get; set; }
    public string? FinishReason { get; set; }
    public Dictionary<string, object>? Usage { get; set; }

    public Guid? FeedbackId { get; set; }
    public SessionMessageFeedbackDto? Feedback { get; set; }
}

/* =========================
 * Message Content (polymorphic)
 * ========================= */
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(SessionMessageTextContentDto), "text")]
[JsonDerivedType(typeof(SessionMessageJsonContentDto), "json")]
[JsonDerivedType(typeof(SessionMessageToolContentDto), "tool")]
[JsonDerivedType(typeof(SessionMessageFileContentDto), "file")]
[JsonDerivedType(typeof(SessionMessageImageContentDto), "image")]
public abstract class SessionMessageContentDto : AuditableDto
{
    [JsonIgnore] public abstract string Type { get; }
}

public sealed class SessionMessageTextContentDto : SessionMessageContentDto
{
    public override string Type => SessionMessageContentTypes.Text;
    public string Text { get; set; } = string.Empty;
}

public sealed class SessionMessageJsonContentDto : SessionMessageContentDto
{
    public override string Type => SessionMessageContentTypes.Json;
    public string Json { get; set; } = string.Empty;
}

public sealed class SessionMessageToolContentDto : SessionMessageContentDto
{
    public override string Type => SessionMessageContentTypes.Tool;
    public string ToolCallId { get; set; } = string.Empty;
    public SessionMessageFunctionCallDto Function { get; set; } = new();
}

public abstract class SessionMessageBytesContentDto : SessionMessageContentDto
{
    public Guid? FileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long? Size { get; set; }
    public string? Url { get; set; }
    public bool IsUrl { get; set; }
    public string? Base64 { get; set; }
}

public sealed class SessionMessageFileContentDto : SessionMessageBytesContentDto
{
    public override string Type => SessionMessageContentTypes.File;
}

public sealed class SessionMessageImageContentDto : SessionMessageBytesContentDto
{
    public override string Type => SessionMessageContentTypes.Image;
    public int? Width { get; set; }
    public int? Height { get; set; }
}

public sealed class SessionMessageFunctionCallDto
{
    public string Name { get; set; } = string.Empty;
    public object Arguments { get; set; } = new();
}

/* =========================
 * Favorites (domain model)
 * ========================= */
public sealed class SessionFavoriteDto : AuditableDto
{
    public string UserId { get; set; } = null!;
    public string SessionId { get; set; } = null!;
    public Guid SessionTypeId { get; set; }
    public DateTime FavoritedAt { get; set; }

    // Optional hydration
    public SessionDto? Session { get; set; }
    public SessionTypeDto? SessionType { get; set; }
}

/* =========================
 * Feedback (domain model)
 * ========================= */
public static class SessionMessageFeedbackValuesDto
{
    public const string Like = "like";
    public const string Dislike = "dislike";
}

public sealed class SessionMessageFeedbackDto : AuditableDto
{
    public Guid? SessionId { get; set; }          // optional for cleanup/queries
    public Guid MessageId { get; set; }           // required target
    public string? UserId { get; set; }           // optional author

    /// <summary>"like" | "dislike"</summary>
    public string Value { get; set; } = SessionMessageFeedbackValuesDto.Like;

    public string? Note { get; set; }             // optional reason
    public string? Source { get; set; }           // client/app metadata
}
