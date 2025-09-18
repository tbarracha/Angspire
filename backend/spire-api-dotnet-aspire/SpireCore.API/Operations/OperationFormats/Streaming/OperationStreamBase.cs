using System.Runtime.CompilerServices;

namespace SpireCore.API.Operations.Streaming;

public abstract class OperationStreamBase<TRequest, TFrame> : OperationBaseCore<TRequest>, IStreamOperation<TRequest, TFrame>
{
    public async IAsyncEnumerable<TFrame> StreamAsync(
        TRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await OnBeforeAsync(request).ConfigureAwait(false);

        if (!await AuthorizeAsync(request).ConfigureAwait(false))
        {
            await foreach (var f in OnForbiddenAsync(request, ct).WithCancellation(ct))
                yield return f;
            yield break;
        }

        var errors = await ValidateAsync(request).ConfigureAwait(false);
        if (errors is { Count: > 0 })
        {
            await foreach (var f in OnValidationFailedAsync(request, errors, ct).WithCancellation(ct))
                yield return f;
            yield break;
        }

        await foreach (var frame in HandleStreamAsync(request, ct).WithCancellation(ct))
            yield return frame;

        await OnAfterAsync(request).ConfigureAwait(false);
    }

    protected abstract IAsyncEnumerable<TFrame> HandleStreamAsync(TRequest request, CancellationToken ct);

    // Defaults: emit nothing (override to send typed error frames)
    protected virtual IAsyncEnumerable<TFrame> OnForbiddenAsync(TRequest request, CancellationToken ct) =>
        EmptyAsync<TFrame>(ct);

    protected virtual IAsyncEnumerable<TFrame> OnValidationFailedAsync(
        TRequest request,
        IReadOnlyList<string> errors,
        CancellationToken ct) =>
        EmptyAsync<TFrame>(ct);

    private static async IAsyncEnumerable<T> EmptyAsync<T>(
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        // No frames by default; immediately complete
        yield break;
    }
}
