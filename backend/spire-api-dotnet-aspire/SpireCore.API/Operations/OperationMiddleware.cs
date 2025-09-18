using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SpireCore.API.JWT;
using SpireCore.API.Operations.Streaming;

namespace SpireCore.API.Operations;

/// <summary>
/// Middleware that wraps both <see cref="IOperation{TReq,TRes}"/> and
/// <see cref="IStreamableOperation{TReq,TRes}"/>.
///
/// ▸ Logs start / end / errors uniformly.  
/// ▸ Forces <c>UserId</c> into any request that implements <see cref="IUserScopedRequest"/>.  
/// ▸ Works for classic and streaming operations.
/// </summary>
public sealed class OperationMiddleware
{
    private readonly ILogger<OperationMiddleware> _log;
    private readonly IHttpContextAccessor _http;
    private readonly IConfiguration _cfg;

    public OperationMiddleware(
        ILogger<OperationMiddleware> log,
        IHttpContextAccessor http,
        IConfiguration cfg)
    {
        _log = log;
        _http = http;
        _cfg = cfg;
    }

    /* -------------------------  non-stream  ------------------------- */

    public async Task<TResponse> ExecuteAsync<TRequest, TResponse>(
        IOperation<TRequest, TResponse> operation,
        TRequest request)
    {
        var principalId = GetUserId(request);

        if (operation is OperationBaseCore<TRequest> coreOp)
            coreOp.SetUser(principalId);

        _log.LogInformation(
            "Starting operation {Op} | UserId={UserId} | RequestType={Req}",
            operation.GetType().Name,
            principalId,
            typeof(TRequest).Name);

        InjectUserIdIfMissing(request);

        try
        {
            var response = await operation.ExecuteAsync(request);

            _log.LogInformation(
                "Completed operation {Op} | UserId={UserId}",
                operation.GetType().Name,
                principalId);

            return response;
        }
        catch (Exception ex)
        {
            _log.LogError(ex,
                "Unhandled exception in operation {Op} | UserId={UserId} | RequestType={Req}",
                operation.GetType().Name,
                principalId,
                typeof(TRequest).Name);

            if (typeof(IActionResult).IsAssignableFrom(typeof(TResponse)))
            {
                var problem = new BadRequestObjectResult(new
                {
                    error = "An error occurred while processing your request.",
                    details = ex.Message
                });
                return (TResponse)(IActionResult)problem;
            }

            throw;
        }
    }

    /* -------------------------  stream  ------------------------- */

    public IAsyncEnumerable<TFrame> ExecuteStream<TOp, TRequest, TFrame>(
        TOp operation, TRequest request, CancellationToken ct = default)
        where TOp : IStreamOperation<TRequest, TFrame>
    {
        var principalId = GetUserId(request);

        if (operation is OperationBaseCore<TRequest> coreOp)
            coreOp.SetUser(principalId);

        _log.LogInformation("Starting stream operation {Op} | UserId={UserId} | RequestType={Req}",
            operation!.GetType().Name, principalId, typeof(TRequest).Name);

        InjectUserIdIfMissing(request);

        var stream = operation.StreamAsync(request, ct);
        return WrapWithLogging(stream, operation.GetType().Name, principalId);

        async IAsyncEnumerable<TFrame> WrapWithLogging(IAsyncEnumerable<TFrame> src, string opName, string? uid,
            [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken token = default)
        {
            var completed = false;
            try
            {
                await foreach (var f in src.WithCancellation(token))
                    yield return f;
                completed = true;
            }
            finally
            {
                _log.LogInformation(completed
                    ? "Completed stream operation {Op} | UserId={UserId}"
                    : "Stream operation FAILED/ABORTED {Op} | UserId={UserId}", opName, uid);
            }
        }
    }

    /* -------------------------  helper  ------------------------- */

    private string GetUserId<TRequest>(TRequest req)
    {
        var ctx = _http.HttpContext;
        if (ctx is null) return string.Empty;

        var bearer = ctx.Request.Headers["Authorization"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(bearer) &&
            bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = bearer["Bearer ".Length..].Trim();
            return JwtExtensions.GetUserIdFromToken(token, _cfg)?.ToString();
        }

        return string.Empty;
    }

    /// <summary>
    /// Ensures every <see cref="IUserScopedRequest"/> carries <c>UserId</c>.
    /// Falls back to parsing the bearer token only when the caller is unauthenticated.
    /// </summary>
    private void InjectUserIdIfMissing<TRequest>(TRequest req)
    {
        var ctx = _http.HttpContext;
        if (ctx is null) return;

        // A) fast path – already authenticated
        var uid = ctx.User.GetUserId()?.ToString();

        // B) fallback – crack bearer token only if authentication failed / skipped
        if (string.IsNullOrWhiteSpace(uid))
        {
            uid = GetUserId(req);
        }

        if (string.IsNullOrWhiteSpace(uid))
        {
            // still nothing: cannot inject
            return;
        }

        // C) inject into the request object
        switch (req)
        {
            case IUserScopedRequest nonGeneric when string.IsNullOrWhiteSpace(nonGeneric.UserId):
                nonGeneric.UserId = uid;
                break;

            default:
                var t = req!.GetType();
                var iface = t.GetInterfaces()
                              .FirstOrDefault(i => i.IsGenericType &&
                                                   i.GetGenericTypeDefinition().Name == "IUserScopedRequest`1");
                if (iface != null)
                {
                    var prop = t.GetProperty("UserId");
                    if (prop?.CanWrite == true &&
                        string.IsNullOrWhiteSpace(prop.GetValue(req) as string))
                    {
                        prop.SetValue(req, Convert.ChangeType(uid, prop.PropertyType));
                    }
                }
                break;
        }
    }
}
