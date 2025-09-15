using Microsoft.AspNetCore.Http;

namespace SpireCore.API.Operations;

public sealed class OperationTimeoutFilter : IEndpointFilter
{
    private readonly TimeSpan _timeout;
    public OperationTimeoutFilter(TimeSpan timeout) => _timeout = timeout;

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ctx.HttpContext.RequestAborted);
        cts.CancelAfter(_timeout);
        ctx.HttpContext.RequestAborted = cts.Token;

        return await next(ctx);
    }
}