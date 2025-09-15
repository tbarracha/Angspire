using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Services;
using Microsoft.Extensions.Logging;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;
using System.ComponentModel;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;

// ---------- Request/Response DTOs ----------
public class RenameSessionFromFirstMessageRequest : IUserScopedRequest
{
    public Guid SessionId { get; set; }

    [DefaultValue(null)]
    public string? UserId { get; set; }

    /// <summary>When true (default), attempts AI-generated title using provider/model.</summary>
    [DefaultValue(true)]
    public bool UseAI { get; set; } = true;

    /// <summary>Provider to use for title generation (e.g., "OpenRouter").</summary>
    [DefaultValue("Ollama")]
    public string? Provider { get; set; }

    /// <summary>Model to use. Optional if your provider has a default model configured.</summary>
    [DefaultValue("gemma3:270m")]
    public string? Model { get; set; } 

    /// <summary>Max words for fallback (non-AI) mode.</summary>
    [DefaultValue(8)]
    public int FallbackMaxWords { get; set; } = 8;
}

public class RenameSessionFromFirstMessageResponse
{
    public bool Success { get; set; }
    public string? OldName { get; set; }
    public string? NewName { get; set; }
    public string? Mode { get; set; } // "ai" or "fallback"
    public string? Reason { get; set; }

    public RenameSessionFromFirstMessageResponse() { }

    public RenameSessionFromFirstMessageResponse(bool success, string? oldName, string? newName, string? mode, string? reason = null)
    {
        Success = success;
        OldName = oldName;
        NewName = newName;
        Mode = mode;
        Reason = reason;
    }
}

// ---------- Operation ----------
[OperationRoute("session/rename")]
public sealed class SessionRenameFromFirstMessageOperation
    : OperationBase<RenameSessionFromFirstMessageRequest, RenameSessionFromFirstMessageResponse>
{
    private readonly ILogger<SessionRenameFromFirstMessageOperation> _log;
    private readonly IRepository<Session> _sessionRepo;
    private readonly IRepository<SessionMessageDb> _messageRepo;
    private readonly ISessionDomainService _sessionSvc;
    private readonly ISessionHelperService _helper;

    public SessionRenameFromFirstMessageOperation(
        ILogger<SessionRenameFromFirstMessageOperation> log,
        IRepository<Session> sessionRepo,
        IRepository<SessionMessageDb> messageRepo,
        ISessionDomainService sessionSvc,
        ISessionHelperService helper)
    {
        _log = log;
        _sessionRepo = sessionRepo;
        _messageRepo = messageRepo;
        _sessionSvc = sessionSvc;
        _helper = helper;
    }

    protected override async Task<RenameSessionFromFirstMessageResponse> HandleAsync(RenameSessionFromFirstMessageRequest request)
    {
        // Load session
        var session = await _sessionRepo.FindAsync(s => s.Id == request.SessionId);
        if (session is null)
            return new(false, null, null, null, "Session not found.");

        // Optional scope check
        if (!string.IsNullOrWhiteSpace(request.UserId) && session.UserId != request.UserId)
            return new(false, session.Name, null, null, "Forbidden: session does not belong to the user.");

        // First USER message
        var rawMsgs = await _messageRepo.FindAllAsync(m => m.SessionId == session.Id && m.Role == AgenticRoles.USER);
        var firstUser = rawMsgs
            .Select(m => m.ToDomain())
            .OrderBy(m => m.CreatedAt == default ? m.UpdatedAt : m.CreatedAt)
            .FirstOrDefault();

        if (firstUser is null)
            return new(false, session.Name, null, null, "No user messages found.");

        var userText = string.Concat(firstUser.Content.OfType<SessionMessageTextContent>().Select(t => t.Text)).Trim();
        if (string.IsNullOrWhiteSpace(userText))
            return new(false, session.Name, null, null, "First user message has no text.");

        var oldName = session.Name;
        string? newName = null;
        string? mode = null;

        // --- Prefer AI via SessionDomainService ---
        if (request.UseAI)
        {
            try
            {
                var candidate = await _sessionSvc.TryGenerateTitleAsync(
                    userText,
                    request.Provider ?? "Ollama",
                    request.Model ?? "gemma3:1b"
                );

                if (!string.IsNullOrWhiteSpace(candidate))
                {
                    newName = candidate; // already cleaned by TryGenerateTitleAsync
                    mode = "ai";
                }
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "AI rename failed for SessionId={SessionId}. Falling back.", session.Id);
                // proceed to fallback
            }
        }

        // --- Fallback (non-AI) using helper utilities ---
        if (string.IsNullOrWhiteSpace(newName))
        {
            newName = _helper.FirstNWords(userText, Math.Max(1, request.FallbackMaxWords));
            newName = _helper.CleanTitle(newName);
            mode = "fallback";
        }

        if (string.IsNullOrWhiteSpace(newName))
            return new(false, oldName, null, mode, "Could not derive a title.");

        // Persist rename (do not alter LastActivityAt)
        session.Name = newName;
        session.UpdatedAt = DateTime.UtcNow;
        await _sessionRepo.UpdateAsync(x => x.Id == session.Id, session);

        _log.LogDebug("Session renamed | SessionId={SessionId} | Old=\"{Old}\" → New=\"{New}\" | Mode={Mode}",
            session.Id, oldName, newName, mode);

        return new(true, oldName, newName, mode);
    }
}
