// File: SpireCore/API/Operations/OperationBaseCore.cs
namespace SpireCore.API.Operations;

/// <summary>
/// Core base for all operation types. Provides common hooks:
///  - OnBeforeAsync / OnAfterAsync
///  - AuthorizeAsync
///  - ValidateAsync (return list of errors; null/empty = ok)
/// 
/// Adapters (regular/stream/websocket) compose these hooks into their pipelines.
/// </summary>
public abstract class OperationBaseCore<TRequest>
{
    /// <summary>
    /// The authenticated user id for this operation instance (if any).
    /// Set by the OperationMiddleware for the lifetime of a single request.
    /// </summary>
    public string? UserId { get; private set; }

    /// <summary>Called by middleware to flow the authenticated user into the operation instance.</summary>
    internal void SetUser(string? userId) =>
        UserId = string.IsNullOrWhiteSpace(userId) ? null : userId;

    internal protected virtual void SetOperationContext(OperationContext context) { }

    protected virtual Task OnBeforeAsync(TRequest request, CancellationToken ct = default)
        => Task.CompletedTask;

    protected virtual Task<bool> AuthorizeAsync(TRequest request, CancellationToken ct = default)
        => Task.FromResult(true);

    /// <summary>Return null or empty to indicate success.</summary>
    protected virtual Task<IReadOnlyList<string>?> ValidateAsync(TRequest request, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<string>?>(null);

    protected virtual Task OnAfterAsync(TRequest request, CancellationToken ct = default)
        => Task.CompletedTask;
}
