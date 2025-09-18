using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Threading.RateLimiting;

namespace SpireCore.API.Operations.WebSockets;

public sealed class HubMessageRateLimiterFilter : IHubFilter
{
    private readonly ConcurrentDictionary<string, TokenBucketRateLimiter> _byConn = new();

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext context, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var limiter = _byConn.GetOrAdd(context.Context.ConnectionId, _ =>
            new TokenBucketRateLimiter(new TokenBucketRateLimiterOptions
            {
                TokenLimit = 10,            // burst
                TokensPerPeriod = 5,        // average rate
                ReplenishmentPeriod = TimeSpan.FromSeconds(1),
                AutoReplenishment = true,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

        var lease = await limiter.AcquireAsync(1, context.Context.ConnectionAborted);
        if (!lease.IsAcquired)
        {
            throw new HubException("Too many messages — slow down.");
        }

        return await next(context);
    }

    public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
        => await next(context);

    public async Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception, Func<HubLifetimeContext, Task> next)
    {
        _byConn.TryRemove(context.Context.ConnectionId, out _);
        await next(context);
    }
}
