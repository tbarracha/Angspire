// File: SpireCore/API/Operations/OperationBase.cs
using SpireCore.API.Operations.Exceptions;

namespace SpireCore.API.Operations;

/// <summary>
/// Regular operation base. Implements the full pipeline:
///  OnBefore > Authorize > Validate > Handle > OnAfter
/// 
/// Default unauthorized / invalid -> exceptions.
/// Override OnForbiddenAsync / OnValidationFailedAsync to return typed TResponse instead.
/// </summary>
public abstract class OperationBase<TRequest, TResponse>
    : OperationBaseCore<TRequest>, IOperation<TRequest, TResponse>
{
    public async Task<TResponse> ExecuteAsync(TRequest request)
    {
        await OnBeforeAsync(request).ConfigureAwait(false);

        if (!await AuthorizeAsync(request).ConfigureAwait(false))
            return await OnForbiddenAsync(request).ConfigureAwait(false);

        var errors = await ValidateAsync(request).ConfigureAwait(false);
        if (errors is { Count: > 0 })
            return await OnValidationFailedAsync(request, errors).ConfigureAwait(false);

        var resp = await HandleAsync(request).ConfigureAwait(false);

        await OnAfterAsync(request).ConfigureAwait(false);
        return resp;
    }

    /// <summary>Business logic implementation.</summary>
    protected abstract Task<TResponse> HandleAsync(TRequest request);

    /// <summary>Default: throw. Override to return typed response (e.g., { Success=false }).</summary>
    protected virtual Task<TResponse> OnForbiddenAsync(TRequest request)
        => throw new OperationForbiddenException();

    /// <summary>Default: throw. Override to return typed response with errors if needed.</summary>
    protected virtual Task<TResponse> OnValidationFailedAsync(TRequest request, IReadOnlyList<string> errors)
        => throw new OperationValidationException(errors);
}
