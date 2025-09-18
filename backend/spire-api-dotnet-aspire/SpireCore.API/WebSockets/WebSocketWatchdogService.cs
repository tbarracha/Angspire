using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SpireCore.API.WebSockets;

public sealed class WebSocketWatchdogService : BackgroundService
{
    private readonly IWebSocketConnectionTracker _tracker;
    private readonly ILogger _log;

    public WebSocketWatchdogService(IWebSocketConnectionTracker tracker, ILogger<WebSocketWatchdogService> log)
    {
        _tracker = tracker;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var snap = _tracker.Snapshot();
            _log.LogInformation("[WS-WATCH] Active={Count}", snap.Count);
            Console.WriteLine($"{DateTime.UtcNow:O} [WS-WATCH] Active={snap.Count}");
            await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);
        }
    }
}