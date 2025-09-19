// File: Genspire.Application.Modules.Agentic.Sessions/Domain/Services/SessionMappingService.cs

using System.Text.Json;
using System.Text.Json.Serialization;
using Genspire.Application.Modules.Agentic.Sessions.Contracts;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;

namespace Genspire.Application.Modules.Agentic.Sessions.Domain.Services;

/// <summary>
/// Pure static mappers for Sessions domain. No repositories, no I/O, no DI.
/// Use as extension helpers (ToDto/ToDomain/ToDb).
/// </summary>
public static class SessionMappingService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /* =========================================================================
     * Session
     * ========================================================================= */
    public static SessionDto ToDto(this Session src)
    {
        var dto = new SessionDto
        {
            Id = src.Id,
            CreatedAt = src.CreatedAt,
            UpdatedAt = src.UpdatedAt,
            UserId = src.UserId,
            Name = src.Name,
            Instructions = src.Instructions,
            IsTemporary = src.IsTemporary,
            LastActivityAt = src.LastActivityAt,
            SessionSettingsId = src.SessionSettingsId,
            SessionTypeId = src.SessionTypeId,
            SessionTimelineId = src.SessionTimelineId,
            SessionStatsId = src.SessionStatsId
        };

        if (src.Settings != null) dto.Settings = src.Settings.ToDto();
        if (src.SessionType != null) dto.SessionType = src.SessionType.ToDto();
        if (src.SessionTimeline != null) dto.SessionTimeline = src.SessionTimeline.ToDto();
        if (src.SessionStats != null) dto.SessionStats = src.SessionStats.ToDto();

        return dto;
    }

    public static Session ToDomain(this SessionDto dto)
    {
        var e = new Session
        {
            Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            UserId = dto.UserId,
            Name = dto.Name,
            Instructions = dto.Instructions,
            IsTemporary = dto.IsTemporary,
            LastActivityAt = dto.LastActivityAt,
            SessionSettingsId = dto.SessionSettingsId,
            SessionTypeId = dto.SessionTypeId,
            SessionTimelineId = dto.SessionTimelineId,
            SessionStatsId = dto.SessionStatsId
        };

        if (dto.Settings != null) e.Settings = dto.Settings.ToDomain();
        if (dto.SessionType != null) e.SessionType = dto.SessionType.ToDomain();
        if (dto.SessionTimeline != null) e.SessionTimeline = dto.SessionTimeline.ToDomain();
        if (dto.SessionStats != null) e.SessionStats = dto.SessionStats.ToDomain();

        return e;
    }

    /* =========================================================================
     * SessionType / Settings / Stats
     * ========================================================================= */
    public static SessionTypeDto ToDto(this SessionType src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        Name = src.Name,
        Description = src.Description,
        IsSystemType = src.IsSystemType,
        IsDefault = src.IsDefault
    };

    public static SessionType ToDomain(this SessionTypeDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,
        Name = dto.Name,
        Description = dto.Description,
        IsSystemType = dto.IsSystemType,
        IsDefault = dto.IsDefault
    };

    public static SessionSettingsDto ToDto(this SessionSettings src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        GenerationSettings = src.GenerationSettings,
        IsDefault = src.IsDefault
    };

    public static SessionSettings ToDomain(this SessionSettingsDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,
        GenerationSettings = dto.GenerationSettings ?? new GenerationSettings(),
        IsDefault = dto.IsDefault
    };

    public static SessionStatsDto ToDto(this SessionStats src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        TotalTimelines = src.TotalTimelines,
        TotalTurns = src.TotalTurns,
        TotalMessages = src.TotalMessages,
        TotalInputTokens = src.TotalInputTokens,
        TotalOutputTokens = src.TotalOutputTokens,
        TotalCost = src.TotalCost,
        LastComputedAt = src.LastComputedAt
    };

    public static SessionStats ToDomain(this SessionStatsDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,
        TotalTimelines = dto.TotalTimelines,
        TotalTurns = dto.TotalTurns,
        TotalMessages = dto.TotalMessages,
        TotalInputTokens = dto.TotalInputTokens,
        TotalOutputTokens = dto.TotalOutputTokens,
        TotalCost = dto.TotalCost,
        LastComputedAt = dto.LastComputedAt
    };

    /* =========================================================================
     * Timeline
     * ========================================================================= */
    public static SessionTimelineDto ToDto(this SessionTimeline src)
    {
        var dto = new SessionTimelineDto
        {
            Id = src.Id,
            CreatedAt = src.CreatedAt,
            UpdatedAt = src.UpdatedAt,
            SessionId = src.SessionId,
            Index = src.Index,
            Summary = src.Summary,
            Description = src.Description,
            IsDefault = src.IsDefault,
            IsAppendOnly = src.IsAppendOnly,
            PreviousTimelineId = src.PreviousTimelineId,
            DivergenceTurnIndex = src.DivergenceTurnIndex,
            SessionTurnIds = src.SessionTurnIds?.ToList() ?? new()
        };

        if (src.SessionTurns?.Count > 0)
            dto.SessionTurns = src.SessionTurns.Select(t => t.ToDto()).ToList();

        return dto;
    }

    public static SessionTimeline ToDomain(this SessionTimelineDto dto)
    {
        var e = new SessionTimeline
        {
            Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            SessionId = dto.SessionId,
            Index = dto.Index,
            Summary = dto.Summary,
            Description = dto.Description,
            IsDefault = dto.IsDefault,
            IsAppendOnly = dto.IsAppendOnly,
            PreviousTimelineId = dto.PreviousTimelineId,
            DivergenceTurnIndex = dto.DivergenceTurnIndex,
            SessionTurnIds = dto.SessionTurnIds?.ToList() ?? new()
        };

        if (dto.SessionTurns?.Count > 0)
            e.SessionTurns = dto.SessionTurns.Select(t => t.ToDomain()).ToList();

        return e;
    }

    /* =========================================================================
    * History & Summaries
    * ========================================================================= */

    // ---- SessionHistory ----
    public static SessionHistoryDto ToDto(this SessionHistory src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,

        SessionId = src.SessionId,
        TimelineId = src.TimelineId,
        TurnIds = src.TurnIds?.ToList() ?? new(),

        TotalTurns = src.TotalTurns,
        TotalMessages = src.TotalMessages,
        WindowTurns = src.WindowTurns,

        LatestSessionSummaryId = src.LatestSessionSummaryId,
        SessionSummaryIds = src.SessionSummaryIds?.ToList() ?? new(),

        Providers = src.Providers?.ToList() ?? new(),
        Models = src.Models?.ToList() ?? new(),

        MaxWindowTurns = src.MaxWindowTurns,
        SummarizeEveryNMessages = src.SummarizeEveryNMessages,
        MaxSummaryTokens = src.MaxSummaryTokens,
        EnableCompaction = src.EnableCompaction,

        LastProcessedTurnIndex = src.LastProcessedTurnIndex,
        LastProcessedTurnId = src.LastProcessedTurnId,

        LastSummarizedAt = src.LastSummarizedAt,
        LastCompactedAt = src.LastCompactedAt
    };

    public static SessionHistory ToDomain(this SessionHistoryDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,

        SessionId = dto.SessionId,
        TimelineId = dto.TimelineId,
        TurnIds = dto.TurnIds?.ToList() ?? new(),

        TotalTurns = dto.TotalTurns,
        TotalMessages = dto.TotalMessages,
        // WindowTurns is computed via domain method OnWindowChanged(); keep read-only in domain.
        // Caller may invoke e.OnWindowChanged() after setting TurnIds if needed.

        LatestSessionSummaryId = dto.LatestSessionSummaryId,
        SessionSummaryIds = dto.SessionSummaryIds?.ToList() ?? new(),

        Providers = dto.Providers is { Count: > 0 } ? dto.Providers.ToHashSet() : new HashSet<string>(),
        Models = dto.Models is { Count: > 0 } ? dto.Models.ToHashSet() : new HashSet<string>(),

        MaxWindowTurns = dto.MaxWindowTurns,
        SummarizeEveryNMessages = dto.SummarizeEveryNMessages,
        MaxSummaryTokens = dto.MaxSummaryTokens,
        EnableCompaction = dto.EnableCompaction,

        LastProcessedTurnIndex = dto.LastProcessedTurnIndex,
        LastProcessedTurnId = dto.LastProcessedTurnId,

        LastSummarizedAt = dto.LastSummarizedAt,
        LastCompactedAt = dto.LastCompactedAt
    };

    // ---- SessionSummary (timeline window snapshot) ----
    public static SessionSummaryDto ToDto(this SessionSummary src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,

        SessionId = src.SessionId,
        TimelineId = src.TimelineId,
        TurnIds = src.TurnIds?.ToList() ?? new(),

        FromTurnIndex = src.FromTurnIndex,
        ToTurnIndex = src.ToTurnIndex,
        TurnCount = src.TurnCount,

        Provider = src.Provider,
        Model = src.Model,
        Settings = src.Settings,
        Usage = src.Usage,
        Cost = src.Cost,

        Summary = src.Summary,
        SummarizedAt = src.SummarizedAt
    };

    public static SessionSummary ToDomain(this SessionSummaryDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,

        SessionId = dto.SessionId,
        TimelineId = dto.TimelineId,
        TurnIds = dto.TurnIds?.ToList() ?? new(),

        FromTurnIndex = dto.FromTurnIndex,
        ToTurnIndex = dto.ToTurnIndex,
        TurnCount = dto.TurnCount,

        Provider = dto.Provider,
        Model = dto.Model,
        Settings = dto.Settings,
        Usage = dto.Usage,
        Cost = dto.Cost,

        Summary = dto.Summary,
        SummarizedAt = dto.SummarizedAt
    };

    // ---- SessionTurnSummary (single turn snapshot) ----
    public static SessionTurnSummaryDto ToDto(this SessionTurnSummary src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,

        SessionId = src.SessionId,
        TimelineId = src.TimelineId,
        TurnIds = src.TurnIds?.ToList() ?? new(),

        SessionTurnId = src.SessionTurnId,
        TurnIndex = src.TurnIndex,

        Provider = src.Provider,
        Model = src.Model,
        Settings = src.Settings,
        Usage = src.Usage,
        Cost = src.Cost,

        Summary = src.Summary,
        SummarizedAt = src.SummarizedAt
    };

    public static SessionTurnSummary ToDomain(this SessionTurnSummaryDto dto)
    {
        var e = new SessionTurnSummary
        {
            Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,

            SessionId = dto.SessionId,
            TimelineId = dto.TimelineId,
            TurnIds = dto.TurnIds?.ToList() ?? new(),

            SessionTurnId = dto.SessionTurnId,
            TurnIndex = dto.TurnIndex,

            Provider = dto.Provider,
            Model = dto.Model,
            Settings = dto.Settings,
            Usage = dto.Usage,
            Cost = dto.Cost,

            Summary = dto.Summary,
            SummarizedAt = dto.SummarizedAt
        };

        // Keep domain invariant helper available
        // If you want to normalize the coverage to the single targeted turn:
        // e.NormalizeTurnIds();

        return e;
    }


    /* =========================================================================
     * Turn
     * ========================================================================= */
    public static SessionTurnDto ToDto(this SessionTurn src)
    {
        var dto = new SessionTurnDto
        {
            Id = src.Id,
            CreatedAt = src.CreatedAt,
            UpdatedAt = src.UpdatedAt,
            SessionId = src.SessionId,
            PreviousTurnId = src.PreviousTurnId,
            TimelineId = src.TimelineId,
            TimelineIndex = src.TimelineIndex,
            InputMessageIds = src.InputMessageIds?.ToList() ?? new(),
            OutputMessageIds = src.OutputMessageIds?.ToList() ?? new(),
            StepIds = src.StepIds?.ToList() ?? new(),
            CurrentExecutionId = src.CurrentExecutionId,
            SelectedInputIndex = src.SelectedInputIndex,
            SelectedOutputIndex = src.SelectedOutputIndex
        };

        if (src.InputMessages?.Count > 0)
            dto.InputMessages = src.InputMessages.Select(m => m.ToDto()).ToList();

        if (src.OutputMessages?.Count > 0)
            dto.OutputMessages = src.OutputMessages.Select(m => m.ToDto()).ToList();

        if (src.Steps?.Count > 0)
            dto.Steps = src.Steps.Select(s => s.ToDto()).ToList();

        return dto;
    }

    public static SessionTurn ToDomain(this SessionTurnDto dto)
    {
        var e = new SessionTurn
        {
            Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            SessionId = dto.SessionId,
            PreviousTurnId = dto.PreviousTurnId,
            TimelineId = dto.TimelineId,
            TimelineIndex = dto.TimelineIndex,
            InputMessageIds = dto.InputMessageIds?.ToList() ?? new(),
            OutputMessageIds = dto.OutputMessageIds?.ToList() ?? new(),
            StepIds = dto.StepIds?.ToList() ?? new(),
            CurrentExecutionId = dto.CurrentExecutionId,
            SelectedInputIndex = dto.SelectedInputIndex,
            SelectedOutputIndex = dto.SelectedOutputIndex
        };

        if (dto.InputMessages?.Count > 0)
            e.InputMessages = dto.InputMessages.Select(m => m.ToDomain()).ToList();

        if (dto.OutputMessages?.Count > 0)
            e.OutputMessages = dto.OutputMessages.Select(m => m.ToDomain()).ToList();

        if (dto.Steps?.Count > 0)
            e.Steps = dto.Steps.Select(s => s.ToDomain()).ToList();

        return e;
    }

    /* =========================================================================
     * Steps
     * ========================================================================= */
    public static TurnStepDto ToDto(this TurnStep src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        SessionTurnId = src.SessionTurnId,
        ExecutionId = src.ExecutionId,
        Index = src.Index,
        PreviousStepId = src.PreviousStepId,
        Kind = src.Kind,
        Payload = src.Payload != null ? BsonToObject(src.Payload) : null,
        CorrelationId = src.CorrelationId
    };

    public static TurnStep ToDomain(this TurnStepDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,
        SessionTurnId = dto.SessionTurnId,
        ExecutionId = dto.ExecutionId,
        Index = dto.Index,
        PreviousStepId = dto.PreviousStepId,
        Kind = dto.Kind,
        Payload = dto.Payload != null ? ObjectToBson(dto.Payload) : new BsonDocument(),
        CorrelationId = dto.CorrelationId
    };

    /* =========================================================================
     * Messages
     * ========================================================================= */

    // --- DB (BSON) <-> DTO ---
    public static SessionMessageDto ToDto(this SessionMessageDb src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        SessionId = src.SessionId,
        SessionTurnId = src.SessionTurnId,
        ParentMessageId = src.ParentMessageId,
        Role = src.Role,
        Provider = src.Provider,
        Model = src.Model,
        Settings = src.Settings,
        FinishReason = src.FinishReason,
        Usage = src.Usage,
        FeedbackId = src.FeedbackId,
        Content = FromBsonContent(src.Content)
    };

    public static SessionMessageDb ToDb(this SessionMessageDto src, Guid? sessionId = null, Guid? turnId = null, Guid? parentId = null)
    {
        return new SessionMessageDb
        {
            Id = src.Id == Guid.Empty ? Guid.NewGuid() : src.Id,
            CreatedAt = src.CreatedAt,
            UpdatedAt = src.UpdatedAt,
            SessionId = sessionId ?? src.SessionId,
            SessionTurnId = turnId ?? src.SessionTurnId,
            ParentMessageId = parentId ?? src.ParentMessageId,
            Role = src.Role,
            Provider = src.Provider,
            Model = src.Model,
            Settings = src.Settings,
            FinishReason = src.FinishReason,
            Usage = src.Usage,
            FeedbackId = src.FeedbackId,
            Content = ToBsonContent(src.Content)
        };
    }

    // --- DB (BSON) <-> Domain (typed) ---
    public static SessionMessage ToDomain(this SessionMessageDb src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        SessionId = src.SessionId,
        SessionTurnId = src.SessionTurnId,
        ParentMessageId = src.ParentMessageId,
        Role = src.Role,
        Provider = src.Provider,
        Model = src.Model,
        Settings = src.Settings,
        FinishReason = src.FinishReason,
        Usage = src.Usage,
        FeedbackId = src.FeedbackId,
        Content = FromBsonContentToDomain(src.Content)
    };

    public static SessionMessageDb ToDb(this SessionMessage src)
    {
        return new SessionMessageDb
        {
            Id = src.Id == Guid.Empty ? Guid.NewGuid() : src.Id,
            CreatedAt = src.CreatedAt,
            UpdatedAt = src.UpdatedAt,
            SessionId = src.SessionId,
            SessionTurnId = src.SessionTurnId,
            ParentMessageId = src.ParentMessageId,
            Role = src.Role,
            Provider = src.Provider,
            Model = src.Model,
            Settings = src.Settings,
            FinishReason = src.FinishReason,
            Usage = src.Usage,
            FeedbackId = src.FeedbackId,
            Content = ToBsonContent(src.Content.ToDtoList())
        };
    }

    // --- Domain (typed) <-> DTO ---
    public static SessionMessageDto ToDto(this SessionMessage src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        SessionId = src.SessionId,
        SessionTurnId = src.SessionTurnId,
        ParentMessageId = src.ParentMessageId,
        Role = src.Role,
        Provider = src.Provider,
        Model = src.Model,
        Settings = src.Settings,
        FinishReason = src.FinishReason,
        Usage = src.Usage,
        FeedbackId = src.FeedbackId,
        Content = src.Content.ToDtoList()
    };

    public static SessionMessage ToDomain(this SessionMessageDto src) => new()
    {
        Id = src.Id == Guid.Empty ? Guid.NewGuid() : src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,
        SessionId = src.SessionId,
        SessionTurnId = src.SessionTurnId,
        ParentMessageId = src.ParentMessageId,
        Role = src.Role,
        Provider = src.Provider,
        Model = src.Model,
        Settings = src.Settings,
        FinishReason = src.FinishReason,
        Usage = src.Usage,
        FeedbackId = src.FeedbackId,
        Content = src.Content.ToDomainList()
    };

    /* =========================================================================
    * Favorites & Feedback
    * ========================================================================= */

    // ---- SessionFavorite ----
    public static SessionFavoriteDto ToDto(this SessionFavorite src)
    {
        var dto = new SessionFavoriteDto
        {
            Id = src.Id,
            CreatedAt = src.CreatedAt,
            UpdatedAt = src.UpdatedAt,

            UserId = src.UserId,
            SessionId = src.SessionId,
            SessionTypeId = src.SessionTypeId,
            FavoritedAt = src.FavoritedAt
        };

        if (src.Session != null) dto.Session = src.Session.ToDto();
        if (src.SessionType != null) dto.SessionType = src.SessionType.ToDto();

        return dto;
    }

    public static SessionFavorite ToDomain(this SessionFavoriteDto dto)
    {
        var e = new SessionFavorite
        {
            Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,

            UserId = dto.UserId ?? string.Empty,
            SessionId = dto.SessionId ?? string.Empty,
            SessionTypeId = dto.SessionTypeId,
            FavoritedAt = dto.FavoritedAt
        };

        if (dto.Session != null) e.Session = dto.Session.ToDomain();
        if (dto.SessionType != null) e.SessionType = dto.SessionType.ToDomain();

        return e;
    }

    // ---- SessionMessageFeedback ----
    public static SessionMessageFeedbackDto ToDto(this SessionMessageFeedback src) => new()
    {
        Id = src.Id,
        CreatedAt = src.CreatedAt,
        UpdatedAt = src.UpdatedAt,

        SessionId = src.SessionId,
        MessageId = src.MessageId,
        UserId = src.UserId,
        Value = src.Value,
        Note = src.Note,
        Source = src.Source
    };

    public static SessionMessageFeedback ToDomain(this SessionMessageFeedbackDto dto) => new()
    {
        Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
        CreatedAt = dto.CreatedAt,
        UpdatedAt = dto.UpdatedAt,

        SessionId = dto.SessionId,
        MessageId = dto.MessageId,
        UserId = dto.UserId,
        Value = dto.Value,
        Note = dto.Note,
        Source = dto.Source
    };


    /* =========================================================================
     * Content: DTO <-> BSON  |  DTO <-> Domain
     * ========================================================================= */

    // DTO -> BSON
    public static List<BsonDocument> ToBsonContent(this IEnumerable<SessionMessageContentDto> items)
    {
        var list = new List<BsonDocument>();
        if (items == null) return list;

        foreach (var i in items)
        {
            switch (i)
            {
                case SessionMessageTextContentDto t:
                    list.Add(new BsonDocument { { "type", "text" }, { "text", t.Text ?? string.Empty } });
                    break;

                case SessionMessageJsonContentDto j:
                    if (TryParseJson(j.Json, out var parsed))
                        list.Add(new BsonDocument { { "type", "json" }, { "json", parsed } });
                    else
                        list.Add(new BsonDocument { { "type", "json" }, { "json", j.Json ?? string.Empty } });
                    break;

                case SessionMessageToolContentDto tool:
                    list.Add(new BsonDocument
                    {
                        { "type", "tool" },
                        { "toolCallId", tool.ToolCallId ?? string.Empty },
                        { "function", new BsonDocument
                            {
                                { "name", tool.Function?.Name ?? string.Empty },
                                { "arguments", SafeObjectToBsonValue(tool.Function?.Arguments) }
                            }
                        }
                    });
                    break;

                case SessionMessageFileContentDto f:
                    {
                        var fb = (SessionMessageBytesContentDto)f;
                        list.Add(new BsonDocument
                    {
                        { "type", "file" },
                        { "fileId", fb.FileId.HasValue ? new BsonBinaryData(fb.FileId.Value, GuidRepresentation.Standard) : BsonNull.Value },
                        { "name", fb.Name ?? string.Empty },
                        { "mimeType", fb.MimeType ?? string.Empty },
                        { "size", fb.Size.HasValue ? new BsonInt64(fb.Size.Value) : BsonNull.Value },
                        { "url", fb.Url != null ? new BsonString(fb.Url) : BsonNull.Value },
                        { "isUrl", fb.IsUrl },
                        { "base64", fb.Base64 != null ? new BsonString(fb.Base64) : BsonNull.Value }
                    });
                        break;
                    }

                case SessionMessageImageContentDto img:
                    {
                        list.Add(new BsonDocument
                    {
                        { "type", "image" },
                        { "fileId", img.FileId.HasValue ? new BsonBinaryData(img.FileId.Value, GuidRepresentation.Standard) : BsonNull.Value },
                        { "name", img.Name ?? string.Empty },
                        { "mimeType", img.MimeType ?? string.Empty },
                        { "size", img.Size.HasValue ? new BsonInt64(img.Size.Value) : BsonNull.Value },
                        { "url", img.Url != null ? new BsonString(img.Url) : BsonNull.Value },
                        { "isUrl", img.IsUrl },
                        { "base64", img.Base64 != null ? new BsonString(img.Base64) : BsonNull.Value },
                        { "width", img.Width.HasValue ? new BsonInt32(img.Width.Value) : BsonNull.Value },
                        { "height", img.Height.HasValue ? new BsonInt32(img.Height.Value) : BsonNull.Value }
                    });
                        break;
                    }

                default:
                    list.Add(new BsonDocument { { "type", i?.GetType().Name ?? "unknown" } });
                    break;
            }
        }
        return list;
    }

    // BSON -> DTO
    public static List<SessionMessageContentDto> FromBsonContent(this IEnumerable<BsonDocument> docs)
    {
        var list = new List<SessionMessageContentDto>();
        if (docs == null) return list;

        foreach (var d in docs)
        {
            var type = d.TryGetValue("type", out var tv) ? tv.AsString : "text";
            switch (type)
            {
                case "text":
                    list.Add(new SessionMessageTextContentDto
                    {
                        Text = d.TryGetValue("text", out var t) ? (t.IsString ? t.AsString : t.ToString()) : string.Empty
                    });
                    break;

                case "json":
                    if (d.TryGetValue("json", out var jv))
                    {
                        if (jv.IsBsonDocument || jv.IsBsonArray)
                            list.Add(new SessionMessageJsonContentDto { Json = jv.ToJson(new JsonWriterSettings { OutputMode = JsonOutputMode.RelaxedExtendedJson }) });
                        else
                            list.Add(new SessionMessageJsonContentDto { Json = jv.IsString ? jv.AsString : "{}" });
                    }
                    else list.Add(new SessionMessageJsonContentDto { Json = "{}" });
                    break;

                case "tool":
                    {
                        var fdoc = d.GetValue("function", new BsonDocument()).AsBsonDocument;
                        var func = new SessionMessageFunctionCallDto
                        {
                            Name = fdoc.GetValue("name", "").AsString,
                            Arguments = BsonToObject(fdoc.GetValue("arguments", BsonNull.Value))
                        };
                        list.Add(new SessionMessageToolContentDto { ToolCallId = d.GetValue("toolCallId", "").AsString, Function = func });
                        break;
                    }

                case "file":
                    {
                        list.Add(new SessionMessageFileContentDto
                        {
                            FileId = TryGetGuid(d, "fileId"),
                            Name = d.GetValue("name", "").AsString,
                            MimeType = d.GetValue("mimeType", "").AsString,
                            Size = d.TryGetValue("size", out var sz) ? (long?)sz.ToInt64() : null,
                            Url = d.TryGetValue("url", out var u) ? (u.IsString ? u.AsString : null) : null,
                            IsUrl = d.TryGetValue("isUrl", out var iu) && iu.ToBoolean(),
                            Base64 = d.TryGetValue("base64", out var b) ? (b.IsString ? b.AsString : null) : null
                        });
                        break;
                    }

                case "image":
                    {
                        list.Add(new SessionMessageImageContentDto
                        {
                            FileId = TryGetGuid(d, "fileId"),
                            Name = d.GetValue("name", "").AsString,
                            MimeType = d.GetValue("mimeType", "").AsString,
                            Size = d.TryGetValue("size", out var isz) ? (long?)isz.ToInt64() : null,
                            Url = d.TryGetValue("url", out var iu2) ? (iu2.IsString ? iu2.AsString : null) : null,
                            IsUrl = d.TryGetValue("isUrl", out var iuz) && iuz.ToBoolean(),
                            Base64 = d.TryGetValue("base64", out var ib) ? (ib.IsString ? ib.AsString : null) : null,
                            Width = d.TryGetValue("width", out var w) ? (int?)w.ToInt32() : null,
                            Height = d.TryGetValue("height", out var h) ? (int?)h.ToInt32() : null
                        });
                        break;
                    }

                default:
                    list.Add(new SessionMessageTextContentDto { Text = string.Empty });
                    break;
            }
        }

        return list;
    }

    // DTO -> Domain
    public static List<SessionMessageContent> ToDomainList(this IEnumerable<SessionMessageContentDto> items)
    {
        var list = new List<SessionMessageContent>();
        if (items == null) return list;

        foreach (var i in items)
        {
            switch (i)
            {
                case SessionMessageTextContentDto t:
                    list.Add(new SessionMessageTextContent { Text = t.Text ?? string.Empty });
                    break;

                case SessionMessageJsonContentDto j:
                    list.Add(new SessionMessageJsonContent { Json = j.Json ?? string.Empty });
                    break;

                case SessionMessageToolContentDto tool:
                    list.Add(new SessionMessageToolContent
                    {
                        ToolCallId = tool.ToolCallId ?? string.Empty,
                        Function = new SessionMessageFunctionCall
                        {
                            Name = tool.Function?.Name ?? string.Empty,
                            Arguments = tool.Function?.Arguments ?? new { }
                        }
                    });
                    break;

                case SessionMessageFileContentDto f:
                    {
                        var fb = (SessionMessageBytesContentDto)f;
                        list.Add(new SessionMessageFileContent
                        {
                            FileId = fb.FileId,
                            Name = fb.Name ?? string.Empty,
                            MimeType = fb.MimeType ?? string.Empty,
                            Size = fb.Size,
                            Url = fb.Url,
                            IsUrl = fb.IsUrl,
                            Base64 = fb.Base64
                        });
                        break;
                    }

                case SessionMessageImageContentDto img:
                    list.Add(new SessionMessageImageContent
                    {
                        FileId = img.FileId,
                        Name = img.Name ?? string.Empty,
                        MimeType = img.MimeType ?? string.Empty,
                        Size = img.Size,
                        Url = img.Url,
                        IsUrl = img.IsUrl,
                        Base64 = img.Base64,
                        Width = img.Width,
                        Height = img.Height
                    });
                    break;
            }
        }

        return list;
    }

    // Domain -> DTO
    public static List<SessionMessageContentDto> ToDtoList(this IEnumerable<SessionMessageContent> items)
    {
        var list = new List<SessionMessageContentDto>();
        if (items == null) return list;

        foreach (var i in items)
        {
            switch (i)
            {
                case SessionMessageTextContent t:
                    list.Add(new SessionMessageTextContentDto { Text = t.Text ?? string.Empty });
                    break;

                case SessionMessageJsonContent j:
                    list.Add(new SessionMessageJsonContentDto { Json = j.Json ?? string.Empty });
                    break;

                case SessionMessageToolContent tool:
                    list.Add(new SessionMessageToolContentDto
                    {
                        ToolCallId = tool.ToolCallId ?? string.Empty,
                        Function = new SessionMessageFunctionCallDto
                        {
                            Name = tool.Function?.Name ?? string.Empty,
                            Arguments = tool.Function?.Arguments ?? new { }
                        }
                    });
                    break;

                case SessionMessageFileContent f:
                    list.Add(new SessionMessageFileContentDto
                    {
                        FileId = f.FileId,
                        Name = f.Name ?? string.Empty,
                        MimeType = f.MimeType ?? string.Empty,
                        Size = f.Size,
                        Url = f.Url,
                        IsUrl = f.IsUrl,
                        Base64 = f.Base64
                    });
                    break;

                case SessionMessageImageContent img:
                    list.Add(new SessionMessageImageContentDto
                    {
                        FileId = img.FileId,
                        Name = img.Name ?? string.Empty,
                        MimeType = img.MimeType ?? string.Empty,
                        Size = img.Size,
                        Url = img.Url,
                        IsUrl = img.IsUrl,
                        Base64 = img.Base64,
                        Width = img.Width,
                        Height = img.Height
                    });
                    break;
            }
        }

        return list;
    }

    /* =========================================================================
     * Helpers
     * ========================================================================= */
    private static Guid? TryGetGuid(BsonDocument d, string key)
    {
        if (!d.TryGetValue(key, out var v) || v is null || v.IsBsonNull) return null;

        try
        {
            // Direct Guid (driver exposes convenience flags)
            if (v.IsGuid) return v.AsGuid;

            // Binary UUID (Standard or Legacy)
            if (v.IsBsonBinaryData)
            {
                var bin = v.AsBsonBinaryData;
                if (bin.SubType == BsonBinarySubType.UuidStandard || bin.SubType == BsonBinarySubType.UuidLegacy)
                    return bin.ToGuid(); // respects embedded representation
            }

            // String representation
            if (v.IsString && Guid.TryParse(v.AsString, out var g)) return g;
        }
        catch
        {
            // swallow and return null
        }

        return null;
    }

    private static bool TryParseJson(string? json, out BsonValue parsed)
    {
        parsed = BsonNull.Value;
        if (string.IsNullOrWhiteSpace(json)) return false;
        try
        {
            parsed = BsonSerializer.Deserialize<BsonValue>(json);
            return true;
        }
        catch { return false; }
    }

    private static BsonValue SafeObjectToBsonValue(object? value)
    {
        if (value is null) return BsonNull.Value;
        try
        {
            // Try serialize to JSON then parse to Bson for stability across arbitrary objects
            var json = JsonSerializer.Serialize(value, JsonOpts);
            return BsonSerializer.Deserialize<BsonValue>(json);
        }
        catch
        {
            // Fallback to string
            return new BsonString(value.ToString() ?? string.Empty);
        }
    }

    private static object? BsonToObject(BsonValue v)
    {
        if (v is null || v.IsBsonNull) return null;
        // Use relaxed JSON to preserve numbers/booleans/arrays/objects sensibly
        var json = v.ToJson(new JsonWriterSettings { OutputMode = JsonOutputMode.RelaxedExtendedJson });
        try { return JsonSerializer.Deserialize<object>(json, JsonOpts); }
        catch { return json; } // last resort: return JSON string
    }

    private static BsonDocument ObjectToBson(object value)
    {
        var val = SafeObjectToBsonValue(value);
        return val as BsonDocument ?? new BsonDocument { { "value", val } };
    }

    // Maps BSON -> DTO -> Domain typed content
    private static List<SessionMessageContent> FromBsonContentToDomain(IEnumerable<BsonDocument> docs)
        => FromBsonContent(docs).ToDomainList();
}
