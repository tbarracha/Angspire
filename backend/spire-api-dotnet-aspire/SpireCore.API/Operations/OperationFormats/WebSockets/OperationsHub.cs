// File: SpireCore.API.Operations.WebSockets/OperationsHub.cs
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SpireCore.API.JWT.Identity;
using SpireCore.API.WebSockets;
using System.Collections.Concurrent;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;

namespace SpireCore.API.Operations.WebSockets;

public sealed class OperationsHub : Hub
{
    private readonly IHubOpRouteIndex _routeIndex;
    private readonly IJwtIdentityService _jwt;
    private readonly ILogger _log; // optional, not used on the hot path
    private readonly IServiceProvider _sp;
    private readonly IWebSocketConnectionTracker _tracker;

    public OperationsHub(
        IHubOpRouteIndex routeIndex,
        IJwtIdentityService jwt,
        ILogger<OperationsHub> log,
        IServiceProvider services,
        IWebSocketConnectionTracker tracker)
    {
        _routeIndex = routeIndex;
        _jwt = jwt;
        _log = log;
        _sp = services;
        _tracker = tracker;
    }

    private sealed class ConnState
    {
        public bool Authenticated;
        public string? UserId;
        public DateTime LastStartUtc;
        public string? CurrentRequestId;
        public string? CurrentCoalesceKey;
        public CancellationTokenSource? LinkedCts;
        public string? TrackerId;
    }

    private static readonly ConcurrentDictionary<string, ConnState> _state = new();

    // ----------------- lifecycle -----------------

    public override Task OnConnectedAsync()
    {
        var http = Context.GetHttpContext();
        var path = http?.Request.Path.Value ?? "/ws/ops";

        // Register with the app-level tracker (no payload calculations)
        var tid = _tracker.OnAccepting(path, http!);
        _tracker.OnOpened(tid);

        _state[Context.ConnectionId] = new ConnState { TrackerId = tid };
        return base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_state.TryRemove(Context.ConnectionId, out var st))
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(st.TrackerId))
                    _tracker.OnClosed(st.TrackerId!, null, exception?.Message);
            }
            catch { /* ignore */ }

            try { st.LinkedCts?.Dispose(); } catch { /* ignore */ }
        }
        await base.OnDisconnectedAsync(exception);
    }

    // ----------------- client methods -----------------

    public async Task Hello(string? authToken)
    {
        var st = _state[Context.ConnectionId];

        // inbound bookkeeping
        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, "hello");

        try
        {
            st.Authenticated = await TryAuthenticateAsync(authToken, st);
            await Emit(WsEnvelopeBuilder.Event("hello_ok"));
        }
        catch (UnauthorizedAccessException ex)
        {
            if (!string.IsNullOrWhiteSpace(st.TrackerId))
                _tracker.OnError(st.TrackerId!, ex, "hello-auth");
            await Emit(WsEnvelopeBuilder.Error("unauthorized", "Invalid or missing token."));
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrWhiteSpace(st.TrackerId))
                _tracker.OnError(st.TrackerId!, ex, "hello-ex");
            await Emit(WsEnvelopeBuilder.Error("server_exception", "Authentication error."));
        }
    }

    /// <summary>Expects WsStartDto-compatible payload with a 'route' field.</summary>
    public async Task Start(JsonElement? startPayload, string? authTokenFromMsg)
    {
        var st = _state[Context.ConnectionId];

        // inbound bookkeeping
        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, "start");

        if (!startPayload.HasValue)
        {
            await Emit(WsEnvelopeBuilder.Error("invalid_start", "Missing payload"));
            return;
        }

        var route = startPayload.Value.TryGetProperty("route", out var r) ? r.GetString() : null;
        if (string.IsNullOrWhiteSpace(route) || !_routeIndex.TryGet(route!, out var opType))
        {
            await Emit(WsEnvelopeBuilder.Error("not_found", $"No operation registered for route '{route}'"));
            return;
        }

        var opObj = _sp.GetService(opType);
        if (opObj is null)
        {
            await Emit(WsEnvelopeBuilder.Error("server_exception", $"Operation type '{opType.Name}' not in DI."));
            return;
        }

        if (!OpMeta.For(opObj.GetType(), out var meta))
        {
            await Emit(WsEnvelopeBuilder.Error("server_exception", "Operation metadata resolution failed."));
            return;
        }

        var start = (WsStartDto?)meta.Deserialize(opObj, startPayload);
        if (start is null)
        {
            await Emit(WsEnvelopeBuilder.Error("invalid_start", "Invalid start payload."));
            return;
        }

        // Authenticate if required (no extra work on hot path)
        if (meta.RequireAuth(opObj) && !st.Authenticated)
        {
            try
            {
                st.Authenticated = await TryAuthenticateAsync(authTokenFromMsg ?? start.AuthToken, st);
            }
            catch (UnauthorizedAccessException ex)
            {
                if (!string.IsNullOrWhiteSpace(st.TrackerId))
                    _tracker.OnError(st.TrackerId!, ex, "start-auth");
                await Emit(WsEnvelopeBuilder.Error("unauthorized", "Valid token required."));
                return;
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(st.TrackerId))
                    _tracker.OnError(st.TrackerId!, ex, "start-auth-ex");
                await Emit(WsEnvelopeBuilder.Error("server_exception", "Authentication error."));
                return;
            }
        }

        // Flow UserId from connection if missing
        if (string.IsNullOrWhiteSpace(start.UserId))
            start.UserId = st.UserId ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        // Cooldown (very cheap)
        var now = DateTime.UtcNow;
        var cooldown = meta.GetCooldown(opObj);
        if (now - st.LastStartUtc < cooldown)
        {
            await Emit(WsEnvelopeBuilder.Error("throttled", "Too many start requests.", new { /* no payload calc */ }));
            return;
        }

        // Validate (operation-controlled)
        var errors = await meta.ValidateAsync(opObj, start, Context.ConnectionAborted);
        if (errors.Count > 0)
        {
            await Emit(WsEnvelopeBuilder.Error("invalid_request", "Validation failed.", new { /* shape only */ }));
            return;
        }

        // Busy / coalesce
        var allowParallel = meta.AllowParallel(opObj);
        if (!allowParallel && st.CurrentRequestId is not null)
        {
            var ck = meta.GetCoalesceKey(opObj, start);
            if (!string.IsNullOrWhiteSpace(ck) && ck == st.CurrentCoalesceKey)
            {
                await Emit(WsEnvelopeBuilder.Event("coalesced",
                    new { requestId = st.CurrentRequestId, key = ck }, st.CurrentRequestId));
            }
            else
            {
                await Emit(WsEnvelopeBuilder.Error("busy", "A run is already in progress.",
                    new { requestId = st.CurrentRequestId }));
            }
            return;
        }

        // Establish run (no counters)
        st.LastStartUtc = now;
        st.CurrentRequestId = Guid.NewGuid().ToString("N");
        st.CurrentCoalesceKey = meta.GetCoalesceKey(opObj, start);

        try { st.LinkedCts?.Dispose(); } catch { /* ignore */ }
        st.LinkedCts = CancellationTokenSource.CreateLinkedTokenSource(Context.ConnectionAborted);

        // ACK
        await Emit(WsEnvelopeBuilder.Ack(st.CurrentRequestId));

        // Stream frames
        try
        {
            var stream = meta.Run(opObj, start, st.CurrentRequestId, st.LinkedCts.Token);
            await foreach (var frame in stream.WithCancellation(st.LinkedCts.Token))
            {
                if (frame.RequestId is null) frame.RequestId = st.CurrentRequestId;
                await Emit(frame);

                if (st.LinkedCts.IsCancellationRequested)
                {
                    await Emit(WsEnvelopeBuilder.Finished(st.CurrentRequestId!, "cancelled", close: false));
                    return;
                }
            }

            await Emit(WsEnvelopeBuilder.Finished(st.CurrentRequestId!, "completed", close: false));
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrWhiteSpace(st.TrackerId))
                _tracker.OnError(st.TrackerId!, ex, "run");
            await Emit(WsEnvelopeBuilder.Error("server_exception", "Run failure.", new { message = ex.Message }));
        }
        finally
        {
            try { st.LinkedCts?.Dispose(); } catch { /* ignore */ }
            st.LinkedCts = null;
            st.CurrentRequestId = null;
            st.CurrentCoalesceKey = null;
        }
    }

    public async Task Cancel(string? requestId = null)
    {
        var st = _state[Context.ConnectionId];

        // inbound bookkeeping
        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, "cancel");

        st.LinkedCts?.Cancel();
        await Emit(WsEnvelopeBuilder.Event("cancelled", new { success = true }, requestId ?? st.CurrentRequestId));
    }

    public Task Inbound(WsEnvelope inbound)
    {
        var st = _state[Context.ConnectionId];
        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, $"inbound:{inbound?.Type ?? "(null)"}");
        return Task.CompletedTask;
    }

    private static string? ToSessionGroup(RescopeRequest dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.Group)) return dto.Group;
        if (!string.IsNullOrWhiteSpace(dto.SessionId)) return $"session:{dto.SessionId}";
        return null;
    }

    public async Task Rescope(RescopeRequest dto)
    {
        var st = _state[Context.ConnectionId];
        // If your ops require auth for groups, enforce it:
        // if (!st.Authenticated) { await Emit(WsEnvelopeBuilder.Error("unauthorized", "Valid token required.")); return; }

        var group = ToSessionGroup(dto);
        if (string.IsNullOrWhiteSpace(group))
        {
            await Emit(WsEnvelopeBuilder.Error("invalid_request", "Group or SessionId required for Rescope."));
            return;
        }

        // Best-effort bookkeeping (not required)
        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, $"rescope:{group}");

        await Groups.AddToGroupAsync(Context.ConnectionId, group);
        await Emit(WsEnvelopeBuilder.Event("rescope_ok", new { group, requestId = dto.RequestId }));
    }

    public async Task JoinGroup(string group, string? requestId = null)
    {
        var st = _state[Context.ConnectionId];
        if (string.IsNullOrWhiteSpace(group))
        {
            await Emit(WsEnvelopeBuilder.Error("invalid_request", "Group is required."));
            return;
        }

        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, $"join:{group}");

        await Groups.AddToGroupAsync(Context.ConnectionId, group);
        await Emit(WsEnvelopeBuilder.Event("join_ok", new { group, requestId }));
    }

    public async Task LeaveGroup(string group, string? requestId = null)
    {
        var st = _state[Context.ConnectionId];
        if (string.IsNullOrWhiteSpace(group))
        {
            await Emit(WsEnvelopeBuilder.Error("invalid_request", "Group is required."));
            return;
        }

        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnReceived(st.TrackerId!, 0, $"leave:{group}");

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
        await Emit(WsEnvelopeBuilder.Event("leave_ok", new { group, requestId }));
    }

    // Optional alias the client may try
    public Task BindSession(string sessionId, string? requestId = null)
        => JoinGroup($"session:{sessionId}", requestId);

    // ----------------- helpers -----------------

    private Task Emit(WsEnvelope env)
    {
        var st = _state[Context.ConnectionId];
        if (!string.IsNullOrWhiteSpace(st.TrackerId))
            _tracker.OnSent(st.TrackerId!, 0, $"out:{env?.Type ?? "(null)"}");

        var tasks = new List<Task> { Clients.Caller.SendAsync("envelope", env) };

        try
        {
            var payload = env?.Payload as JsonElement?;
            string? sessionId = null;
            if (payload.HasValue && payload.Value.ValueKind == JsonValueKind.Object)
            {
                if (payload.Value.TryGetProperty("sessionId", out var sid)) sessionId = sid.GetString();
                else if (payload.Value.TryGetProperty("SessionId", out var sidP)) sessionId = sidP.GetString();
            }

            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                var group = $"session:{sessionId}";
                // ⬇️ fan out to everyone else in the session, not the caller
                tasks.Add(Clients.OthersInGroup(group).SendAsync("envelope", env));
            }
        }
        catch { /* never throw from emit */ }

        return Task.WhenAll(tasks);
    }


    private async Task<bool> TryAuthenticateAsync(string? token, ConnState st)
    {
        if (string.IsNullOrWhiteSpace(token)) throw new UnauthorizedAccessException();
        var trimmed = token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? token[7..].Trim() : token.Trim();
        var principal = _jwt.ValidateJwt(trimmed) ?? throw new UnauthorizedAccessException();
        st.UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return await Task.FromResult(true);
    }

    // ----------------- reflection cache for operations -----------------

    private sealed class OpMeta
    {
        private static readonly ConcurrentDictionary<Type, OpMeta> _cache = new();

        private readonly MethodInfo _deserialize;
        private readonly MethodInfo _validate;
        private readonly MethodInfo _run;
        private readonly PropertyInfo _requireAuth;
        private readonly PropertyInfo _allowParallel;
        private readonly PropertyInfo _cooldown;
        private readonly MethodInfo _getCoalesceKey;

        private OpMeta(Type concrete)
        {
            var iface = concrete.GetInterfaces()
                .Single(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IHubOperation<>));

            _deserialize = iface.GetMethod(nameof(IHubOperation<WsStartDto>.Deserialize))!;
            _validate = iface.GetMethod(nameof(IHubOperation<WsStartDto>.ValidateAsync))!;
            _run = iface.GetMethod(nameof(IHubOperation<WsStartDto>.OnStartedAsync))!;
            _requireAuth = iface.GetProperty(nameof(IHubOperation<WsStartDto>.RequireAuth))!;
            _allowParallel = iface.GetProperty(nameof(IHubOperation<WsStartDto>.AllowParallelStarts))!;
            _cooldown = iface.GetProperty(nameof(IHubOperation<WsStartDto>.StartCooldown))!;
            _getCoalesceKey = iface.GetMethod(nameof(IHubOperation<WsStartDto>.GetCoalesceKey))!;
        }

        public static bool For(Type t, out OpMeta meta)
        {
            meta = _cache.GetOrAdd(t, static tt => new OpMeta(tt));
            return true;
        }

        public WsStartDto? Deserialize(object op, JsonElement? payload)
            => (WsStartDto?)_deserialize.Invoke(op, new object?[] { payload });

        public Task<IReadOnlyList<string>> ValidateAsync(object op, WsStartDto start, CancellationToken ct)
            => (Task<IReadOnlyList<string>>)_validate.Invoke(op, new object?[] { start, ct })!;

        public IAsyncEnumerable<WsEnvelope> Run(object op, WsStartDto start, string requestId, CancellationToken ct)
            => (IAsyncEnumerable<WsEnvelope>)_run.Invoke(op, new object?[] { start, requestId, ct })!;

        public bool RequireAuth(object op) => (bool)_requireAuth.GetValue(op)!;
        public bool AllowParallel(object op) => (bool)_allowParallel.GetValue(op)!;
        public TimeSpan GetCooldown(object op) => (TimeSpan)_cooldown.GetValue(op)!;
        public string? GetCoalesceKey(object op, WsStartDto start)
            => (string?)_getCoalesceKey.Invoke(op, new object[] { start })!;
    }
}
