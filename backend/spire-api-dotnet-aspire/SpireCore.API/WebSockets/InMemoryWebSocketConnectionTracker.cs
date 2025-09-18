
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SpireCore.Services;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;

namespace SpireCore.API.WebSockets;

public interface IWebSocketConnectionTracker
{
    string OnAccepting(string route, HttpContext ctx);
    void OnOpened(string id);
    void OnReceived(string id, int bytes, string? note = null);
    void OnSent(string id, int bytes, string? note = null);
    void OnError(string id, Exception ex, string? phase = null);
    void OnClosed(string id, WebSocketCloseStatus? status, string? reason);
    IReadOnlyCollection<WebSocketConnectionSnapshot> Snapshot();
}

public sealed record WebSocketConnectionSnapshot(
    string Id,
    string Route,
    string Remote,
    DateTime ConnectedAtUtc,
    DateTime LastActivityUtc,
    string State,
    long BytesIn,
    long BytesOut,
    int MsgIn,
    int MsgOut,
    string? LastNote
);

public sealed class InMemoryWebSocketConnectionTracker : IWebSocketConnectionTracker, ISingletonService
{
    private readonly ILogger _log;
    private const bool TRACE_WS = true;

    private sealed class Entry
    {
        public string Id = default!;
        public string Route = default!;
        public string Remote = default!;
        public DateTime ConnectedAtUtc;
        public DateTime LastActivityUtc;
        public long BytesIn;
        public long BytesOut;
        public int MsgIn;
        public int MsgOut;
        public string State = "Accepting";
        public string? LastNote;
    }

    private readonly ConcurrentDictionary<string, Entry> _map = new(StringComparer.Ordinal);

    public InMemoryWebSocketConnectionTracker(ILoggerFactory lf)
    {
        _log = lf.CreateLogger<InMemoryWebSocketConnectionTracker>();
        Console.WriteLine("[InMemoryWebSocketConnectionTracker] Created!");
    }

    private static string NewId() => Guid.NewGuid().ToString("N");

    public string OnAccepting(string route, HttpContext ctx)
    {
        var id = NewId();
        var e = new Entry
        {
            Id = id,
            Route = route,
            Remote = $"{ctx.Connection.RemoteIpAddress}:{ctx.Connection.RemotePort}",
            ConnectedAtUtc = DateTime.UtcNow,
            LastActivityUtc = DateTime.UtcNow,
            State = "Accepting"
        };
        _map[id] = e;
        Log(LogLevel.Information, id, "ACCEPTING", new { route, e.Remote });
        return id;
    }

    public void OnOpened(string id)
    {
        if (_map.TryGetValue(id, out var e))
        {
            e.State = "Open";
            e.LastActivityUtc = DateTime.UtcNow;
            Log(LogLevel.Information, id, "OPEN");
        }
    }

    public void OnReceived(string id, int bytes, string? note = null)
    {
        if (_map.TryGetValue(id, out var e))
        {
            e.BytesIn += bytes;
            e.MsgIn++;
            e.LastActivityUtc = DateTime.UtcNow;
            e.LastNote = note;
            if (TRACE_WS) Log(LogLevel.Debug, id, "RECV", new { bytes, note, e.MsgIn, e.BytesIn });
        }
    }

    public void OnSent(string id, int bytes, string? note = null)
    {
        if (_map.TryGetValue(id, out var e))
        {
            e.BytesOut += bytes;
            e.MsgOut++;
            e.LastActivityUtc = DateTime.UtcNow;
            e.LastNote = note;
            if (TRACE_WS) Log(LogLevel.Debug, id, "SEND", new { bytes, note, e.MsgOut, e.BytesOut });
        }
    }

    public void OnError(string id, Exception ex, string? phase = null)
    {
        if (_map.TryGetValue(id, out var e))
        {
            e.LastActivityUtc = DateTime.UtcNow;
            e.LastNote = $"ERR:{phase}";
        }
        Log(LogLevel.Error, id, $"ERROR {(phase ?? "")}".Trim(), ex: ex);
    }

    public void OnClosed(string id, WebSocketCloseStatus? status, string? reason)
    {
        if (_map.TryGetValue(id, out var e))
        {
            e.State = $"Closed({status})";
            e.LastActivityUtc = DateTime.UtcNow;
            e.LastNote = reason;
        }
        Log(LogLevel.Information, id, "CLOSED", new { status, reason });
        _map.TryRemove(id, out _);
    }

    public IReadOnlyCollection<WebSocketConnectionSnapshot> Snapshot()
    {
        return _map.Values.Select(e =>
            new WebSocketConnectionSnapshot(
                e.Id, e.Route, e.Remote, e.ConnectedAtUtc, e.LastActivityUtc,
                e.State, e.BytesIn, e.BytesOut, e.MsgIn, e.MsgOut, e.LastNote
            )).ToArray();
    }

    private void Log(LogLevel level, string id, string msg, object? data = null, Exception? ex = null)
    {
        // ILogger
        if (data is null)
            _log.Log(level, ex, "[WS {Id}] {Msg}", id, msg);
        else
            _log.Log(level, ex, "[WS {Id}] {Msg} {@Data}", id, msg, data);

        // Console
        var ts = DateTime.UtcNow.ToString("O");
        if (data is null)
            Console.WriteLine($"{ts} [{level}] [WS {id}] {msg}");
        else
        {
            string payload;
            try { payload = JsonSerializer.Serialize(data); } catch { payload = data.ToString() ?? "(data)"; }
            Console.WriteLine($"{ts} [{level}] [WS {id}] {msg} | {payload}");
        }
    }
}
