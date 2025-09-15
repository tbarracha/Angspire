// Domain/Models/Session.cs

using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.Abstractions.Interfaces;
using SpireCore.API.DbProviders.Mongo.Entities;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.Agentic.Sessions.Domain.Models;

/* =========================
 *  Session (metadata only)
 * ========================= */

[BsonIgnoreExtraElements]
public class Session : MongoAuditableEntity, ILastActivityAt
{
    public string? UserId { get; set; }
    public string? Name { get; set; }
    public string? Instructions { get; set; }
    public bool IsTemporary { get; set; }
    public DateTime LastActivityAt { get; set; }

    // Session Settings
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionSettingsId { get; set; }
    public SessionSettings? Settings { get; set; }

    // Session Type
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionTypeId { get; set; }
    public SessionType? SessionType { get; set; }

    // Session Timeline
    /// <summary>Pointer to the ACTIVE timeline (latest branch).</summary>
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionTimelineId { get; set; }
    [BsonIgnore]
    public SessionTimeline? SessionTimeline { get; set; }

    // Session History
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionHistoryId { get; set; }
    [BsonIgnore]
    public SessionHistory? SessionHistory { get; set; }

    // Session Statistics
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionStatsId { get; set; }
    public SessionStats? SessionStats { get; set; }
}

/* =========================
 *  SessionType, Settings & Stats
 * ========================= */

[BsonIgnoreExtraElements]
public class SessionType : MongoAuditableEntity, IIsDefault
{
    public string Name { get; set; } = string.Empty;    // chat, tool, workflow, etc
    public string? Description { get; set; }
    public bool IsSystemType { get; set; } = true;      // built-ins vs. custom
    public bool IsDefault { get; set; }
}

[BsonIgnoreExtraElements]
public class SessionSettings : MongoAuditableEntity, IIsDefault
{
    public GenerationSettings GenerationSettings { get; set; } = new();
    public bool IsDefault { get; set; }
}

[BsonIgnoreExtraElements]
public class SessionStats : MongoAuditableEntity
{
    public int TotalTimelines { get; set; }
    public int TotalTurns { get; set; }
    public int TotalMessages { get; set; }
    public long TotalInputTokens { get; set; }
    public long TotalOutputTokens { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime? LastComputedAt { get; set; }
}

/* =========================
 *  Session History
 * ========================= */
// ==== Base: SessionTimelineScopedEntity ======================================
[BsonIgnoreExtraElements]
public abstract class SessionTimelineScopedEntity : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid SessionId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid TimelineId { get; set; }

    /// <summary>Ordered list of TurnIds this entity covers.</summary>
    [BsonRepresentation(BsonType.String)]
    public List<Guid> TurnIds { get; set; } = new();
}

// ==== SessionHistory ==========================================================
[BsonIgnoreExtraElements]
public sealed class SessionHistory : SessionTimelineScopedEntity
{
    // Aggregate counters (fast guards)
    public int TotalTurns { get; set; } = 0;        // lifetime seen for this timeline
    public int TotalMessages { get; set; } = 0;     // cached; derive from turns when rebuilding
    public int WindowTurns { get; private set; } = 0;

    // Summaries (snapshots)
    [BsonRepresentation(BsonType.String)]
    public Guid? LatestSessionSummaryId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public List<Guid> SessionSummaryIds { get; set; } = new();

    // Provenance across all produced summaries for this timeline
    public HashSet<string> Providers { get; set; } = new();
    public HashSet<string> Models { get; set; } = new();

    // Compaction / summarization policy (runtime-managed)
    public int MaxWindowTurns { get; set; } = 16;
    public int SummarizeEveryNMessages { get; set; } = 40;
    public int MaxSummaryTokens { get; set; } = 2048;
    public bool EnableCompaction { get; set; } = true;

    // Idempotency helpers for incremental rebuild
    public int LastProcessedTurnIndex { get; set; } = -1;

    [BsonRepresentation(BsonType.String)]
    public Guid? LastProcessedTurnId { get; set; }

    public DateTime? LastSummarizedAt { get; set; }
    public DateTime? LastCompactedAt { get; set; }

    // ---- tiny guards / helpers
    public void OnWindowChanged() => WindowTurns = TurnIds.Count;

    public void RegisterProviderModel(string? provider, string? model)
    {
        if (!string.IsNullOrWhiteSpace(provider)) Providers.Add(provider);
        if (!string.IsNullOrWhiteSpace(model)) Models.Add(model);
    }
}

// ==== Base: SessionSummaryBase ===============================================
[BsonIgnoreExtraElements]
public abstract class SessionSummaryBase : SessionTimelineScopedEntity
{
    // Provenance
    public string Provider { get; set; } = string.Empty;   // e.g., "openai"
    public string Model { get; set; } = string.Empty;      // e.g., "gpt-4o-mini"

    public GenerationSettings? Settings { get; set; }
    public Dictionary<string, object>? Usage { get; set; } // tokens, latency, etc.
    public decimal? Cost { get; set; }

    public DateTime SummarizedAt { get; set; } = DateTime.UtcNow;

    // Summary payload
    public string Summary { get; set; } = string.Empty;
}

// ==== SessionSummary (timeline window snapshot) ===============================
[BsonIgnoreExtraElements]
public sealed class SessionSummary : SessionSummaryBase
{
    /// <summary>Timeline-based coverage (inclusive indices).</summary>
    public int FromTurnIndex { get; set; } = 0;
    public int ToTurnIndex { get; set; } = -1;
    public int TurnCount { get; set; } = 0;
}

// ==== SessionTurnSummary (optional single-turn snapshot) ======================
[BsonIgnoreExtraElements]
public sealed class SessionTurnSummary : SessionSummaryBase
{
    [BsonRepresentation(BsonType.String)]
    public Guid SessionTurnId { get; set; }

    public int TurnIndex { get; set; } = 0;

    /// <summary>Normalize TurnIds to the single targeted turn.</summary>
    public void NormalizeTurnIds()
    {
        if (SessionTurnId != Guid.Empty) TurnIds = new List<Guid> { SessionTurnId };
        else TurnIds.Clear();
    }
}

/* =========================
 *  Timeline
 * ========================= */

[BsonIgnoreExtraElements]
public class SessionTimeline : MongoAuditableEntity, IIsDefault
{
    [BsonRepresentation(BsonType.String)]
    public Guid SessionId { get; set; }

    /// <summary>Incremental Timeline index so we can count how many timelines</summary>
    public int Index { get; set; }

    public string? Summary { get; set; }
    public string? Description { get; set; }

    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// Treat as append-only for domain invariants. Repositories should prevent removal or
    /// reordering of existing turns. Branching → create a NEW timeline.
    /// </summary>
    public bool IsAppendOnly { get; set; } = true;

    [BsonRepresentation(BsonType.String)]
    public Guid? PreviousTimelineId { get; set; }

    /// <summary>Index where branch diverged from its base timeline.</summary>
    public int? DivergenceTurnIndex { get; set; }

    [BsonRepresentation(BsonType.String)]
    public List<Guid> SessionTurnIds { get; set; } = new();

    [BsonIgnore]
    public List<SessionTurn> SessionTurns { get; set; } = new();
}

/* =========================
 *  SessionTurn
 * ========================= */

[BsonIgnoreExtraElements]
public class SessionTurn : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid SessionId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? PreviousTurnId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? TimelineId { get; set; }

    /// <summary>Position within the conversation for a given timeline.</summary>
    public int TimelineIndex { get; set; }

    // -------- Persisted references (append-only) --------
    [BsonRepresentation(BsonType.String)]
    public List<Guid> InputMessageIds { get; set; } = new();

    [BsonRepresentation(BsonType.String)]
    public List<Guid> OutputMessageIds { get; set; } = new();

    [BsonRepresentation(BsonType.String)]
    public List<Guid> StepIds { get; set; } = new();

    // -------- Hydrated views (not stored) --------
    [BsonIgnore]
    public List<SessionMessage> InputMessages { get; set; } = new();

    [BsonIgnore]
    public List<SessionMessage> OutputMessages { get; set; } = new();

    [BsonIgnore]
    public List<TurnStep> Steps { get; set; } = new();

    [BsonRepresentation(BsonType.String)]
    public Guid CurrentExecutionId { get; set; } = Guid.Empty;

    /// <summary>Selected input version index in <see cref="InputMessageIds"/> (usually the last).</summary>
    public int SelectedInputIndex { get; set; } = -1;

    /// <summary>Selected output version index in <see cref="OutputMessageIds"/> (set on generation/regeneration).</summary>
    public int SelectedOutputIndex { get; set; } = -1;

    // (Optional tiny guards)
    public void SelectLatestInput() => SelectedInputIndex = InputMessageIds.Count - 1;
    public void SelectLatestOutput() => SelectedOutputIndex = OutputMessageIds.Count - 1;
}

/* =========================
 *  TurnStep (tool calls, partials)
 * ========================= */

public static class TurnStepKinds
{
    public const string ToolCall = "tool_call";
    public const string ToolResult = "tool_result";
    public const string RagLookup = "rag_lookup";
    public const string Reasoning = "reasoning";
    public const string SafetyCheck = "safety_check";
    public const string Retry = "retry";
}

[BsonIgnoreExtraElements]
public class TurnStep : MongoAuditableEntity
{
    // Tie to the specific Turn (not just Session).
    [BsonRepresentation(BsonType.String)]
    public Guid SessionTurnId { get; set; }

    // Correlate a single execution (regen => new ExecutionId).
    [BsonRepresentation(BsonType.String)]
    public Guid? ExecutionId { get; set; }

    // Stable ordering within an execution.
    public int Index { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? PreviousStepId { get; set; } = null;

    // String-based “kind” (tool_call, tool_result, rag_lookup, reasoning, etc.).
    // Use a constants class or config to avoid magic strings.
    public string Kind { get; set; } = TurnStepKinds.ToolCall;

    // Arbitrary payload; accepts BSON natively and JSON via mapping at the API boundary.
    // Prefer small docs here; put large blobs in external storage and reference them.
    public BsonDocument Payload { get; set; } = new();

    /// <summary>Correlation id (e.g., toolCallId) to link tool-call/result.</summary>
    public string? CorrelationId { get; set; }
}

/* =========================
 *  SessionMessage (per turn)
 *  - Stores both user and assistant messages
 *  - Assistant may include provider/model/settings and usage
 * ========================= */

[BsonIgnoreExtraElements]
public abstract class SessionMessageBase : MongoAuditableEntity
{
    /// <summary>Redundant but helpful for queries; turn already has SessionId.</summary>
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionId { get; set; }

    /// <summary>Pointer back to the turn containing this message.</summary>
    [BsonRepresentation(BsonType.String)]
    public Guid? SessionTurnId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? ParentMessageId { get; set; }

    /// <summary>"user" or "assistant"</summary>
    [DefaultValue(AgenticRoles.USER)]
    public string Role { get; set; } = AgenticRoles.USER;

    // ---- Assistant metadata (null for user messages) ----
    public string? Provider { get; set; }
    public string? Model { get; set; }
    public GenerationSettings? Settings { get; set; }

    public string? FinishReason { get; set; }
    public Dictionary<string, object>? Usage { get; set; }

    [BsonRepresentation(BsonType.String)]
    [DefaultValue(null)]
    public Guid? FeedbackId { get; set; }

    [BsonIgnore]
    public SessionMessageFeedback? Feedback { get; set; }
}

// Persisted/raw (for storage)
[BsonIgnoreExtraElements]
public sealed class SessionMessageDb : SessionMessageBase
{
    /// <summary>
    /// Raw polymorphic content stored as BSON docs.
    /// Each element should carry a discriminator "type" matching your DTOs ("text", "image", ...).
    /// </summary>
    public List<BsonDocument> Content { get; set; } = new();
}

// Hydrated/typed (for domain/UI)
[BsonIgnoreExtraElements]
public class SessionMessage : SessionMessageBase
{
    /// <summary>
    /// Strongly-typed content used in-domain and on the wire after parsing from DB form.
    /// </summary>
    public List<SessionMessageContent> Content { get; set; } = new();
}

/* =========================
 *  Content Polymorphism
 * ========================= */

public static class SessionMessageContentTypes
{
    public const string Text = "text";
    public const string Json = "json";
    public const string Tool = "tool";
    public const string File = "file";
    public const string Image = "image";
}

// ----- IMPORTANT: MongoDB/STJ polymorphism annotations -----
[BsonIgnoreExtraElements]
[BsonDiscriminator(RootClass = true, Required = true)]
[BsonKnownTypes(typeof(SessionMessageTextContent), typeof(SessionMessageJsonContent), typeof(SessionMessageToolContent), typeof(SessionMessageFileContent), typeof(SessionMessageImageContent))]
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(SessionMessageTextContent), "text")]
[JsonDerivedType(typeof(SessionMessageJsonContent), "json")]
[JsonDerivedType(typeof(SessionMessageToolContent), "tool")]
[JsonDerivedType(typeof(SessionMessageFileContent), "file")]
[JsonDerivedType(typeof(SessionMessageImageContent), "image")]
public abstract class SessionMessageContent : MongoAuditableEntity
{
    // Expose discriminator for STJ convenience
    [BsonIgnore]
    public abstract string Type { get; }
}

[BsonIgnoreExtraElements]
[BsonDiscriminator(SessionMessageContentTypes.Text)]
public class SessionMessageTextContent : SessionMessageContent
{
    public override string Type => SessionMessageContentTypes.Text;
    public string Text { get; set; } = string.Empty;
}

[BsonIgnoreExtraElements]
[BsonDiscriminator(SessionMessageContentTypes.Json)]
public class SessionMessageJsonContent : SessionMessageContent
{
    public override string Type => SessionMessageContentTypes.Json;
    public string Json { get; set; } = string.Empty;
}

[BsonIgnoreExtraElements]
[BsonDiscriminator(SessionMessageContentTypes.Tool)]
public class SessionMessageToolContent : SessionMessageContent
{
    public override string Type => SessionMessageContentTypes.Tool;
    public string ToolCallId { get; set; } = string.Empty;
    public SessionMessageFunctionCall Function { get; set; } = new();
}

[BsonIgnoreExtraElements]
public class SessionMessageFunctionCall
{
    public string Name { get; set; } = string.Empty;
    public object Arguments { get; set; } = new();
}

[BsonIgnoreExtraElements]
public abstract class SessionMessageBytesContent : SessionMessageContent
{
    [BsonRepresentation(BsonType.String)]
    public Guid? FileId { get; set; } = null;

    public string Name { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long? Size { get; set; } = null;
    public string? Url { get; set; } = null;

    public bool IsUrl { get; set; } = false;

    [NotMapped]
    public string? Base64 { get; set; } = null;
}

[BsonIgnoreExtraElements]
[BsonDiscriminator(SessionMessageContentTypes.File)]
public class SessionMessageFileContent : SessionMessageBytesContent
{
    public override string Type => SessionMessageContentTypes.File;
}

[BsonIgnoreExtraElements]
[BsonDiscriminator(SessionMessageContentTypes.Image)]
public class SessionMessageImageContent : SessionMessageBytesContent
{
    public override string Type => SessionMessageContentTypes.Image;
    public int? Width { get; set; } = null;
    public int? Height { get; set; } = null;
}

/// <summary>
/// Represents a user's favorite session for a given session type.
/// </summary>
public class SessionFavorite : MongoAuditableEntity
{
    public string UserId { get; set; } = null!;
    public string SessionId { get; set; } = null!;

    [BsonRepresentation(BsonType.String)]
    public Guid SessionTypeId { get; set; }
    public DateTime FavoritedAt { get; set; } = DateTime.UtcNow;
    // Optionally for aggregation/navigation:
    public Session? Session { get; set; }
    public SessionType? SessionType { get; set; }
}

public static class SessionMessageFeedbackValues
{
    public const string Like = "like";
    public const string Dislike = "dislike";
}

[BsonIgnoreExtraElements]
public sealed class SessionMessageFeedback : MongoAuditableEntity
{
    /// <summary>Owner session (optional but handy for queries/cleanup).</summary>
    [BsonRepresentation(BsonType.String)]
    [DefaultValue(null)]
    public Guid? SessionId { get; set; } = null;

    /// <summary>Target message id (required).</summary>
    [BsonRepresentation(BsonType.String)]
    [Required]
    public Guid MessageId { get; set; }

    /// <summary>User who left the feedback (optional if system-wide).</summary>
    [DefaultValue(null)]
    public string? UserId { get; set; } = null;

    /// <summary>"like" | "dislike"</summary>
    [Required]
    [RegularExpression("^(like|dislike)$", ErrorMessage = "Value must be 'like' or 'dislike'.")]
    public string Value { get; set; } = SessionMessageFeedbackValues.Like;

    /// <summary>Optional free-text reason/comment.</summary>
    [DefaultValue(null)]
    public string? Note { get; set; } = null;

    /// <summary>Client/device/app metadata (optional).</summary>
    [DefaultValue(null)]
    public string? Source { get; set; } = null;
}