// File: SessionMessageFeedbackOperations.cs
using Genspire.Application.Modules.Agentic.Sessions.Contracts;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Repositories;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;

#region Contracts
// --- Request DTOs (classes so IUserScopedRequest can be populated by pipeline) ---
public class SetMessageFeedbackRequest : IUserScopedRequest
{
    /// <summary>Populated automatically by pipeline/interceptor.</summary>
    [DefaultValue(null)]
    public string? UserId { get; set; } = null;

    [Required]
    public string MessageId { get; set; } = default!; // Guid as string

    /// <summary>"like" | "dislike"</summary>
    [Required, RegularExpression("^(like|dislike)$", ErrorMessage = "Value must be 'like' or 'dislike'.")]
    public string Value { get; set; } = "like";

    [DefaultValue(null)]
    public string? SessionId { get; set; } = null; // Guid? as string

    [DefaultValue(null)]
    public string? Note { get; set; } = null;

    [DefaultValue(null)]
    public string? Source { get; set; } = null;
}

public class UnsetMessageFeedbackRequest : IUserScopedRequest
{
    /// <summary>Populated automatically by pipeline/interceptor.</summary>
    [DefaultValue(null)]
    public string? UserId { get; set; } = null;

    [Required]
    public string MessageId { get; set; } = default!;
}

/// <summary>List all feedback for a message; optionally filtered by UserId.</summary>
public class ListMessageFeedbackRequest : IUserScopedRequest
{
    [Required]
    public string MessageId { get; set; } = default!;

    [DefaultValue(null)]
    public string? UserId { get; set; } = null;
}

/// <summary>DEV-ONLY: Removes feedbacks by optional filters.</summary>
public class DevUnsetAllMessageFeedbacksRequest
{
    [DefaultValue(null)]
    public string? UserId { get; set; } = null;

    [DefaultValue(null)]
    public string? MessageId { get; set; } = null; // Guid? as string
}

// --- Response DTOs ---
public record SetMessageFeedbackResponseDto(bool Success, SessionMessageFeedbackDto? Feedback);
public record UnsetMessageFeedbackResponseDto(bool Success);
public record ListMessageFeedbackResponseDto(List<SessionMessageFeedbackDto> Feedbacks);
public record DevUnsetAllMessageFeedbacksResponseDto(int UpdatedCount);
#endregion

#region Operations
[OperationRoute("session/message/feedback/set")]
public sealed class SetSessionMessageFeedbackOperation : OperationBase<SetMessageFeedbackRequest, SetMessageFeedbackResponseDto>
{
    private readonly SessionMessageDbRepository _messageRepo;
    private readonly SessionMessageFeedbackRepository _feedbackRepo;

    public SetSessionMessageFeedbackOperation(
        SessionMessageDbRepository messageRepo,
        SessionMessageFeedbackRepository feedbackRepo)
    {
        _messageRepo = messageRepo;
        _feedbackRepo = feedbackRepo;
    }

    protected override async Task<SetMessageFeedbackResponseDto> HandleAsync(SetMessageFeedbackRequest request)
    {
        // Validate message id
        if (!Guid.TryParse(request.MessageId, out var messageId))
            return new(false, null);

        // Optional session id
        Guid? sessionId = null;
        if (!string.IsNullOrWhiteSpace(request.SessionId))
        {
            if (!Guid.TryParse(request.SessionId, out var parsed))
                return new(false, null);
            sessionId = parsed;
        }

        // Ensure target message exists
        var msg = await _messageRepo.GetByIdAsync(messageId);
        if (msg is null)
            return new(false, null);

        // Normalize/validate value
        var v = (request.Value ?? "").Trim().ToLowerInvariant();
        if (v != "like" && v != "dislike")
            return new(false, null);

        // Upsert per (MessageId, UserId)
        var saved = await _feedbackRepo.UpsertFeedbackAsync(
            request.UserId, messageId, sessionId, v, request.Note, request.Source);

        return new(true, ToDto(saved));
    }

    private static SessionMessageFeedbackDto ToDto(SessionMessageFeedback m) => new()
    {
        Id = m.Id,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt,

        SessionId = m.SessionId,
        MessageId = m.MessageId,
        UserId = m.UserId,
        Value = m.Value,
        Note = m.Note,
        Source = m.Source
    };
}

[OperationRoute("session/message/feedback/unset")]
public sealed class UnsetSessionMessageFeedbackOperation : OperationBase<UnsetMessageFeedbackRequest, UnsetMessageFeedbackResponseDto>
{
    private readonly SessionMessageFeedbackRepository _repo;
    public UnsetSessionMessageFeedbackOperation(SessionMessageFeedbackRepository repo) => _repo = repo;

    protected override async Task<UnsetMessageFeedbackResponseDto> HandleAsync(UnsetMessageFeedbackRequest request)
    {
        if (!Guid.TryParse(request.MessageId, out var messageId))
            return new(false);

        await _repo.RemoveFeedbackAsync(request.UserId, messageId);
        return new(true);
    }
}

/// <summary>List feedback for a message (optional filter by user).</summary>
[OperationRoute("session/message/feedback/list")]
public sealed class ListSessionMessageFeedbackOperation : OperationBase<ListMessageFeedbackRequest, ListMessageFeedbackResponseDto>
{
    private readonly SessionMessageFeedbackRepository _repo;
    public ListSessionMessageFeedbackOperation(SessionMessageFeedbackRepository repo) => _repo = repo;

    protected override async Task<ListMessageFeedbackResponseDto> HandleAsync(ListMessageFeedbackRequest request)
    {
        if (!Guid.TryParse(request.MessageId, out var messageId))
            return new(new());

        var items = await _repo.GetFeedbacksByMessageAsync(messageId, request.UserId);
        var dtos = items.Select(ToDto).ToList();
        return new(dtos);
    }

    private static SessionMessageFeedbackDto ToDto(SessionMessageFeedback m) => new()
    {
        Id = m.Id,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt,

        SessionId = m.SessionId,
        MessageId = m.MessageId,
        UserId = m.UserId,
        Value = m.Value,
        Note = m.Note,
        Source = m.Source
    };
}

/// <summary>DEV-ONLY: bulk remove feedbacks by optional filters (UserId and/or MessageId).</summary>
[OperationRoute("session/message/feedback/dev/unset-all")]
public sealed class DevUnsetAllSessionMessageFeedbacksOperation : OperationBase<DevUnsetAllMessageFeedbacksRequest, DevUnsetAllMessageFeedbacksResponseDto>
{
    private readonly SessionMessageFeedbackRepository _repo;
    public DevUnsetAllSessionMessageFeedbacksOperation(SessionMessageFeedbackRepository repo) => _repo = repo;

    protected override async Task<DevUnsetAllMessageFeedbacksResponseDto> HandleAsync(DevUnsetAllMessageFeedbacksRequest request)
    {
        int removed;
        if (!string.IsNullOrWhiteSpace(request.UserId)
            && !string.IsNullOrWhiteSpace(request.MessageId)
            && Guid.TryParse(request.MessageId, out var msgIdBoth))
        {
            removed = await _repo.DeleteRangeAsync(f => f.UserId == request.UserId && f.MessageId == msgIdBoth);
        }
        else if (!string.IsNullOrWhiteSpace(request.UserId))
        {
            removed = await _repo.DeleteRangeAsync(f => f.UserId == request.UserId);
        }
        else if (!string.IsNullOrWhiteSpace(request.MessageId) && Guid.TryParse(request.MessageId, out var msgId))
        {
            removed = await _repo.DeleteRangeAsync(f => f.MessageId == msgId);
        }
        else
        {
            removed = await _repo.DeleteRangeAsync(_ => true);
        }

        return new(removed);
    }
}
#endregion
