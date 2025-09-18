// File: SpireCore/API/Operations/Streaming/CancelStreamOperationBase.cs

namespace SpireCore.API.Operations.Streaming;

/// <summary>
/// Base cancel operation for any streamable feature.
/// Derive and add your own [OperationRoute("feature/xyz/cancel")] attribute.
/// </summary>
public abstract class CancelStreamOperationBase<TRequest, TResponse>
    : IOperation<TRequest, TResponse>
    where TRequest : IStreamCancelRequest
    where TResponse : IStreamCancelResponse, new()
{
    private readonly IStreamAbortRegistry _registry;

    protected CancelStreamOperationBase(IStreamAbortRegistry registry)
        => _registry = registry;

    /// <summary>
    /// Hook to authorize/validate before cancel.
    /// Return false to block the cancel.
    /// </summary>
    protected virtual Task<bool> AuthorizeAsync(TRequest request, CancellationToken ct = default)
        => Task.FromResult(true);

    /// <summary>
    /// Hook to extract the requestId. Override if your request encodes it differently.
    /// </summary>
    protected virtual string? ResolveRequestId(TRequest request)
        => request.RequestId?.Trim();

    public async Task<TResponse> ExecuteAsync(TRequest request)
    {
        if (!await AuthorizeAsync(request).ConfigureAwait(false))
            return new TResponse { Cancelled = false };

        var rid = ResolveRequestId(request);
        var ok = !string.IsNullOrWhiteSpace(rid) && _registry.Cancel(rid!);

        return new TResponse { Cancelled = ok };
    }
}
