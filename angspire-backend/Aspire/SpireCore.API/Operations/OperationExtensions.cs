// File: SpireCore.API.Operations/OperationsExtensions.cs
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyModel;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;
using SpireCore.API.Operations.WebSockets;
using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

public static class OperationsExtensions
{
    // Toggle to get deep internal logs during startup endpoint mapping.
    private const bool LOG_INTERNALS = false;

    private const string WsStubPrefix = "/api/ws/"; // avoid collision with classic HTTP routes

    // Central camelCase JSON options for WS (and reusable elsewhere if needed)
    private static readonly JsonSerializerOptions CamelJson = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    // ---------- Registration (services only) ----------
    public static void AddOperations(this IServiceCollection services)
    {
        // DO NOT map the hub here (no 'app' in this method)
        services.AddSingleton<IHubOperationRegistry, HubOperationRegistry>();

        // Register the route index used by OperationsHub
        services.AddSingleton<IHubOpRouteIndex, HubOpRouteIndex>();

        services
            .AddSignalR()
            .AddJsonProtocol(o =>
            {
                o.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                o.PayloadSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
                o.PayloadSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
                o.PayloadSerializerOptions.PropertyNameCaseInsensitive = true;
            });

        // Scrutor scanning for HTTP + STREAM + Hub ops
        services.Scan(scan => scan
            .FromApplicationDependencies()
            .AddClasses(c => c.Where(IsHttpOperation))
                .AsSelf().AsImplementedInterfaces().WithTransientLifetime()
            .AddClasses(c => c.Where(IsStreamOperation)) // <-- NEW
                .AsSelf().AsImplementedInterfaces().WithTransientLifetime()
            .AddClasses(c => c.Where(IsHubOperation))
                .AsSelf().AsImplementedInterfaces().WithTransientLifetime());

        services.AddScoped<OperationMiddleware>();

        // RateLimiter policies (unchanged)
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy("ops-default", httpCtx =>
            {
                var key = BuildPartitionKey(httpCtx, byUserThenIp: true, includeRoute: true);
                return RateLimitPartition.GetFixedWindowLimiter(
                    key,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });

            options.AddPolicy("ops-strict", httpCtx =>
            {
                var key = BuildPartitionKey(httpCtx, byUserThenIp: true, includeRoute: true);
                return RateLimitPartition.GetFixedWindowLimiter(
                    key,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromSeconds(30),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });

            options.AddPolicy("ops-stream", httpCtx =>
            {
                var key = BuildPartitionKey(httpCtx, byUserThenIp: true, includeRoute: true);
                return RateLimitPartition.GetTokenBucketLimiter(
                    key,
                    _ => new TokenBucketRateLimiterOptions
                    {
                        ReplenishmentPeriod = TimeSpan.FromSeconds(1),
                        TokensPerPeriod = 3,
                        TokenLimit = 6,
                        AutoReplenishment = true,
                        QueueLimit = 0,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    });
            });
        });

        // Throttle SignalR hub method invocations
        services.AddSingleton<IHubFilter, HubMessageRateLimiterFilter>();

        // <-- Registry for canceling HTTP streams
        services.AddSingleton<IStreamAbortRegistry, InMemoryStreamAbortRegistry>();
    }

    // ---------- Endpoint mapping (must be called from Program.cs) ----------
    public static void MapOperationsEndpoints(this WebApplication app, bool log = false, bool mapHub = true)
    {
        if (mapHub)
        {
            LogInternal(null, "[HUB  ] Mapping hub at /ws/ops");
            app.MapHub<OperationsHub>("/ws/ops");
        }

        app.MapAllOperations(log);

        // ---- Universal stream cancel endpoint (mapped ONCE) ----
        app.MapPost("/api/streams/cancel",
            (IStreamAbortRegistry reg, StreamCancelRequest req) =>
            {
                if (string.IsNullOrWhiteSpace(req.RequestId))
                    return Results.BadRequest(new { error = "RequestId is required." });

                var ok = reg.Cancel(req.RequestId);
                return ok
                    ? Results.Accepted($"/api/streams/{req.RequestId}", new StreamCancelResponse { Cancelled = true, Message = "Cancellation requested." })
                    : Results.NotFound(new StreamCancelResponse { Cancelled = false, Message = "No active stream with that RequestId." });
            })
            .WithTags("Streaming")
            .RequireRateLimiting("ops-strict")
            .WithOpenApi(op =>
            {
                op.Summary = "Cancel a running HTTP stream by RequestId.";
                return op;
            });
    }

    // ---------- Classic (HTTP) ----------
    public static RouteHandlerBuilder MapOperation<TOp, TReq, TRes>(
        WebApplication app, string route, string httpMethod)
        where TOp : IOperation<TReq, TRes>
    {
        var groupName = OperationGroupAttribute.GetGroupName(typeof(TwoTypes<TOp, TReq>));
        var uniqueName = $"{groupName}_{typeof(TOp).Name}_{httpMethod}_{Guid.NewGuid():N}";

        static async Task<IResult> HandlerCore(OperationMiddleware middleware, TOp op, TReq req)
        {
            var result = await middleware.ExecuteAsync(op, req);
            return result is IResult r ? r : Results.Json(result);
        }

        RouteHandlerBuilder builder;

        // Explicit binding to avoid “Body was inferred…” error.
        switch (httpMethod.ToUpperInvariant())
        {
            case "GET":
                LogInternal(null, $"[MAP  ] GET {route} => {typeof(TOp).FullName} (req: [AsParameters])");
                builder = app.MapGet(
                    route,
                    ([FromServices] OperationMiddleware middleware,
                     [FromServices] TOp op,
                     [AsParameters] TReq req)
                        => HandlerCore(middleware, op, req));
                break;

            case "DELETE":
                LogInternal(null, $"[MAP  ] DELETE {route} => {typeof(TOp).FullName} (req: [AsParameters])");
                builder = app.MapDelete(
                    route,
                    ([FromServices] OperationMiddleware middleware,
                     [FromServices] TOp op,
                     [AsParameters] TReq req)
                        => HandlerCore(middleware, op, req));
                break;

            case "PUT":
                LogInternal(null, $"[MAP  ] PUT {route} => {typeof(TOp).FullName} (req: [FromBody])");
                builder = app.MapPut(
                    route,
                    ([FromServices] OperationMiddleware middleware,
                     [FromServices] TOp op,
                     [FromBody] TReq req)
                        => HandlerCore(middleware, op, req));
                break;

            default: // POST
                LogInternal(null, $"[MAP  ] POST {route} => {typeof(TOp).FullName} (req: [FromBody])");
                builder = app.MapPost(
                    route,
                    ([FromServices] OperationMiddleware middleware,
                     [FromServices] TOp op,
                     [FromBody] TReq req)
                        => HandlerCore(middleware, op, req));
                break;
        }

        builder.WithName(uniqueName);

        // ---- Rate limiting policy selection (attribute → policy; default if missing) ----
        var throttleAttr = typeof(TOp).GetCustomAttribute<OperationThrottleAttribute>();
        var policy = throttleAttr?.PolicyName ?? "ops-default";
        builder.RequireRateLimiting(policy);

        // ---- Conservative request size caps (override per-op by adding your own attributes if needed) ----
        var maxBody = httpMethod.Equals("GET", StringComparison.OrdinalIgnoreCase) ||
                      httpMethod.Equals("DELETE", StringComparison.OrdinalIgnoreCase)
            ? 1 * 1024 * 1024      // 1 MiB for query-based endpoints
            : 10 * 1024 * 1024;    // 10 MiB default for JSON posts/puts

        builder.Add(endpointBuilder =>
        {
            endpointBuilder.Metadata.Add(new RequestSizeLimitAttribute(maxBody));
        });

        var producesFileAttr = typeof(TOp).GetCustomAttribute<OperationProducesFileAttribute>();
        builder.WithOpenApi(op =>
        {
            if (producesFileAttr is not null)
            {
                op.Responses["200"].Description = $"Returns a file download ({producesFileAttr.ContentType})";
                op.Responses["200"].Content.Clear();
                op.Responses["200"].Content.Add(producesFileAttr.ContentType, new OpenApiMediaType());
            }
            else
            {
                op.Responses["200"].Description = $"Success ({typeof(TRes).Name})";
            }
            return op;
        });

        return builder;
    }

    // ---------- Streaming (HTTP) ----------
    public static RouteHandlerBuilder MapStreamOperation<TOp, TReq, TFrame>(
    WebApplication app, string route, string httpMethod)
    where TOp : IStreamOperation<TReq, TFrame>
    {
        var groupName = OperationGroupAttribute.GetGroupName(typeof(TwoTypes<TOp, TReq>));
        var uniqueName = $"{groupName}_{typeof(TOp).Name}_{httpMethod}_stream_{Guid.NewGuid():N}";

        async Task HandlerCore(
            HttpContext http,
            [FromServices] OperationMiddleware middleware,
            [FromServices] IStreamAbortRegistry aborts,
            [FromServices] TOp op,
            TReq req,
            CancellationToken outerCt)
        {
            // 1) RequestId
            var requestId = http.Request.Headers["X-Client-Request-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestId))
                requestId = Guid.NewGuid().ToString("N");

            http.Response.Headers["X-Request-Id"] = requestId;

            // 2) Linked CTS
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(outerCt, http.RequestAborted);

            // Register
            var regKey = requestId;
            if (!aborts.TryRegister(regKey, linkedCts))
            {
                regKey = $"{requestId}:{Guid.NewGuid():N}";
                http.Response.Headers["X-Request-Id"] = regKey;
                aborts.TryRegister(regKey, linkedCts);
            }

            try
            {
                // 3) Execute stream — specify generic args explicitly
                var frames = middleware.ExecuteStream<TOp, TReq, TFrame>(op, req, linkedCts.Token);

                // 4) Wire format
                var declared = typeof(TOp).GetCustomAttribute<OperationStreamAttribute>()?.Format?.Trim().ToLowerInvariant();
                var wantsSse = declared == "sse" || (declared is null && HttpStreamWriters.WantsSse(http));

                if (wantsSse)
                    await HttpStreamWriters.WriteSseAsync(http, frames, linkedCts.Token, eventName: "message");
                else
                    await HttpStreamWriters.WriteNdjsonAsync(http, frames, linkedCts.Token);
            }
            finally
            {
                aborts.Remove(regKey);
            }
        }

        RouteHandlerBuilder builder = httpMethod.ToUpperInvariant() switch
        {
            "GET" => app.MapGet(route, (HttpContext http,
                [FromServices] OperationMiddleware middleware,
                [FromServices] IStreamAbortRegistry aborts,
                [FromServices] TOp op,
                [AsParameters] TReq req,
                CancellationToken ct) => HandlerCore(http, middleware, aborts, op, req, ct)),

            "DELETE" => app.MapDelete(route, (HttpContext http,
                [FromServices] OperationMiddleware middleware,
                [FromServices] IStreamAbortRegistry aborts,
                [FromServices] TOp op,
                [AsParameters] TReq req,
                CancellationToken ct) => HandlerCore(http, middleware, aborts, op, req, ct)),

            "PUT" => app.MapPut(route, (HttpContext http,
                [FromServices] OperationMiddleware middleware,
                [FromServices] IStreamAbortRegistry aborts,
                [FromServices] TOp op,
                [FromBody] TReq req,
                CancellationToken ct) => HandlerCore(http, middleware, aborts, op, req, ct)),

            _ => app.MapPost(route, (HttpContext http,
                [FromServices] OperationMiddleware middleware,
                [FromServices] IStreamAbortRegistry aborts,
                [FromServices] TOp op,
                [FromBody] TReq req,
                CancellationToken ct) => HandlerCore(http, middleware, aborts, op, req, ct)),
        };

        builder.WithName(uniqueName);

        var throttleAttr = typeof(TOp).GetCustomAttribute<OperationThrottleAttribute>();
        var policy = throttleAttr?.PolicyName ?? "ops-stream";
        builder.RequireRateLimiting(policy);

        var maxBody = httpMethod.Equals("GET", StringComparison.OrdinalIgnoreCase) ||
                      httpMethod.Equals("DELETE", StringComparison.OrdinalIgnoreCase)
            ? 1 * 1024 * 1024
            : 2 * 1024 * 1024;

        builder.Add(endpointBuilder =>
        {
            endpointBuilder.Metadata.Add(new RequestSizeLimitAttribute(maxBody));
        });

        builder.WithOpenApi(op =>
        {
            op.Summary = "Streaming endpoint (NDJSON/SSE, cancelable).";
            op.Description = "Streams frames as **NDJSON** or **SSE**. " +
                             "The response includes `X-Request-Id`; cancel via `POST /api/streams/cancel`.";
            op.Responses.Clear();
            op.Responses["200"] = new OpenApiResponse { Description = "OK (streaming)" };
            op.Responses["429"] = new OpenApiResponse { Description = "Too Many Requests" };
            op.Responses["401"] = new OpenApiResponse { Description = "Unauthorized" };
            op.Responses["403"] = new OpenApiResponse { Description = "Forbidden" };
            return op;
        });

        return builder;
    }


    // ---------- Bulk discovery & mapping ----------
    public static void MapAllOperations(this WebApplication app, bool log = false)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Operations.Rest");
        var hubRegistry = app.Services.GetRequiredService<IHubOperationRegistry>();
        var routeIndex = app.Services.GetRequiredService<IHubOpRouteIndex>();

        LogInternal(logger, "[Operations] BEGIN endpoint mapping");
        if (log) logger.LogInformation("[Operations] Mapping all operations.");

        var relevantAssemblies = GetRelevantAssemblies(logger).ToArray();
        LogInternal(logger, $"[Operations] Assemblies to scan: {relevantAssemblies.Length}");
        foreach (var a in relevantAssemblies) LogInternal(logger, $"    - {a.GetName().Name}");

        var opTypes = new List<Type>();
        foreach (var assembly in relevantAssemblies)
        {
            try
            {
                var types = assembly.GetTypes().Where(t =>
                    t.IsClass && !t.IsAbstract &&
                    (t.Namespace?.Contains(".Operations.") == true || t.Namespace?.EndsWith(".Operations") == true));

                foreach (var t in types)
                    opTypes.Add(t);
            }
            catch (ReflectionTypeLoadException ex)
            {
                logger.LogWarning("[ReflectionTypeLoadException] {Assembly}", assembly.FullName);
                foreach (var e in ex.LoaderExceptions ?? Array.Empty<Exception>())
                    logger.LogWarning("    {Message}", e.Message);
            }
        }

        LogInternal(logger, $"[Operations] Candidate operation types: {opTypes.Count}");

        var sorted = SortForStableRegistration(opTypes);

        int httpCount = 0, streamCount = 0, hubTypeCount = 0, wsStubCount = 0;

        foreach (var opType in sorted)
        {
            try
            {
                var hasHttp = ImplementsHttpOperation(opType);
                var hasStream = ImplementsStreamOperation(opType);
                var hasHub = ImplementsHubOperation(opType);

                // <-- FIX: include hasStream so stream-only ops aren't skipped
                if (!hasHttp && !hasStream && !hasHub)
                    continue;

                var isHidden = opType.IsDefined(typeof(OperationHiddenAttribute), false);
                var groupName = OperationGroupAttribute.GetGroupName(opType);

                // --- Classic HTTP ---
                if (hasHttp)
                {
                    httpCount++;
                    var classicIface = opType.GetInterfaces()
                        .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IOperation<,>));
                    var requestType = classicIface.GetGenericArguments()[0];
                    var responseType = classicIface.GetGenericArguments()[1];

                    var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
                    var methodAttr = opType.GetCustomAttribute<OperationMethodAttribute>();
                    var authAttr = opType.GetCustomAttribute<OperationAuthorizeAttribute>();

                    var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();
                    var route = routeAttr != null
                        ? $"/api/{routeAttr.Route}"
                        : $"/api/{groupName.ToLowerInvariant()}/{operationName}";
                    var httpMethod = methodAttr?.HttpMethod ?? "POST";

                    var method = typeof(OperationsExtensions)
                        .GetMethod(nameof(MapOperation), BindingFlags.Public | BindingFlags.Static)!
                        .MakeGenericMethod(opType, requestType, responseType);

                    LogInternal(logger, $"[HTTP ] [{httpMethod}] {route} => {opType.FullName}");
                    var builder = (RouteHandlerBuilder)method.Invoke(null, new object[] { app, route, httpMethod })!;
                    ApplyAuth(builder, authAttr);
                    if (isHidden) builder.ExcludeFromDescription(); else builder.WithTags(groupName);

                    if (log) logger.LogInformation("       - [{Method}] {Route} => {Type}", httpMethod.ToUpperInvariant(), route, opType.FullName);
                }

                // --- Streaming HTTP (IAsyncEnumerable<>) ---
                if (hasStream)
                {
                    streamCount++;
                    var streamIface = opType.GetInterfaces()
                        .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IStreamOperation<,>));
                    var requestType = streamIface.GetGenericArguments()[0];
                    var frameType = streamIface.GetGenericArguments()[1];

                    var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
                    var methodAttr = opType.GetCustomAttribute<OperationMethodAttribute>();
                    var authAttr = opType.GetCustomAttribute<OperationAuthorizeAttribute>();

                    var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();
                    var route = routeAttr != null
                        ? $"/api/{routeAttr.Route}"
                        : $"/api/{groupName.ToLowerInvariant()}/{operationName}/stream";
                    var httpMethod = methodAttr?.HttpMethod ?? "POST";

                    var method = typeof(OperationsExtensions)
                        .GetMethod(nameof(MapStreamOperation), BindingFlags.Public | BindingFlags.Static)!
                        .MakeGenericMethod(opType, requestType, frameType);

                    LogInternal(logger, $"[STRM] [{httpMethod}] {route} => {opType.FullName}");
                    var builder = (RouteHandlerBuilder)method.Invoke(null, new object[] { app, route, httpMethod })!;
                    ApplyAuth(builder, authAttr);
                    if (isHidden) builder.ExcludeFromDescription(); else builder.WithTags(groupName);

                    if (log) logger.LogInformation("       - [{Method}] {Route} (stream) => {Type}", httpMethod.ToUpperInvariant(), route, opType.FullName);
                }

                // --- Hub (unchanged) ---
                if (hasHub)
                {
                    hubTypeCount++;

                    var hubIface = opType.GetInterfaces()
                        .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IHubOperation<>));
                    var startType = hubIface.GetGenericArguments()[0];

                    var canonicalWsRoute = GetCanonicalRoute(opType);
                    hubRegistry.Register(canonicalWsRoute, sp => sp.GetRequiredService(opType), startType);
                    routeIndex.Add(canonicalWsRoute, opType);

                    var routes = DiscoverWsRoutes(app, opType, canonicalWsRoute, logger);

                    var authAttr = opType.GetCustomAttribute<OperationAuthorizeAttribute>();
                    var throttleAttr = opType.GetCustomAttribute<OperationThrottleAttribute>();
                    var policy = throttleAttr?.PolicyName ?? "ops-default";

                    foreach (var wsRoute in routes.Distinct(StringComparer.OrdinalIgnoreCase))
                    {
                        hubRegistry.Register(wsRoute, sp => sp.GetRequiredService(opType), startType);
                        routeIndex.Add(wsRoute, opType);

                        var httpRoute = $"{WsStubPrefix}{wsRoute}";
                        var uniqueName = $"{groupName}_{opType.Name}_signalr_stub_{Guid.NewGuid():N}";

                        var stubBuilder = app.MapPost(httpRoute, () => Results.NoContent());
                        stubBuilder.WithName(uniqueName);
                        stubBuilder.WithTags(groupName);
                        stubBuilder.Produces(StatusCodes.Status204NoContent);
                        stubBuilder.Produces(StatusCodes.Status401Unauthorized);
                        stubBuilder.Produces(StatusCodes.Status403Forbidden);
                        ApplyAuth(stubBuilder, authAttr);
                        stubBuilder.RequireRateLimiting(policy);

                        stubBuilder.WithOpenApi(op =>
                        {
                            op.Summary = "Realtime operation (SignalR stub: empty input/output)";
                            op.Description =
                                "Use the SignalR hub **/ws/ops** and set `start.route` to the advertised path. Returns **204 No Content**.";
                            op.Responses.Clear();
                            op.Responses["204"] = new OpenApiResponse { Description = "No Content" };
                            op.Responses["401"] = new OpenApiResponse { Description = "Unauthorized" };
                            op.Responses["403"] = new OpenApiResponse { Description = "Forbidden" };
                            return op;
                        });

                        wsStubCount++;
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[Error] Failed to map {Type}", opType.FullName);
            }
        }

        LogInternal(logger, $"[Operations] END endpoint mapping | HTTP:{httpCount} Stream:{streamCount} HubTypes:{hubTypeCount} WS stubs:{wsStubCount}");

        if (log) ListAllOperations(app);
    }

    private static IReadOnlyCollection<string> DiscoverWsRoutes(WebApplication app, Type opType, string canonicalWsRoute, ILogger logger)
    {
        LogInternal(logger, $"[WSDISC] Begin route discovery for {opType.FullName}");
        try
        {
            if (typeof(IAdvertisesHubRoutes).IsAssignableFrom(opType))
            {
                using var scope = app.Services.CreateScope();
                object? instance = null;

                try
                {
                    instance = scope.ServiceProvider.GetRequiredService(opType);
                    LogInternal(logger, $"[WSDISC] DI resolved instance for {opType.FullName}");
                }
                catch (Exception diEx)
                {
                    LogInternal(logger, $"[WSDISC] DI resolve failed for {opType.FullName}: {diEx.Message}. Trying ActivatorUtilities…");
                    try
                    {
                        instance = ActivatorUtilities.CreateInstance(scope.ServiceProvider, opType);
                        LogInternal(logger, $"[WSDISC] ActivatorUtilities created instance for {opType.FullName}");
                    }
                    catch (Exception actEx)
                    {
                        LogInternal(logger, $"[WSDISC] ActivatorUtilities failed for {opType.FullName}: {actEx.Message}. Falling back to canonical '{canonicalWsRoute}'", actEx);
                        logger.LogWarning(actEx, "[WS] ActivatorUtilities failed for {Type}", opType.FullName);
                        return new[] { canonicalWsRoute };
                    }
                }

                var adv = (IAdvertisesHubRoutes)instance!;
                var routes = adv.Routes ?? Array.Empty<string>();
                if (routes.Count == 0)
                {
                    LogInternal(logger, $"[WSDISC] {opType.FullName} advertises 0 routes; fallback to canonical '{canonicalWsRoute}'");
                    return new[] { canonicalWsRoute };
                }

                foreach (var r in routes) LogInternal(logger, $"[WSDISC] Advertised route: {r} (op={opType.FullName})");
                return routes.ToArray();
            }

            LogInternal(logger, $"[WSDISC] {opType.FullName} does not implement IAdvertisesHubRoutes; using canonical '{canonicalWsRoute}'");
        }
        catch (Exception ex)
        {
            LogInternal(logger, $"[WSDISC] Route discovery failed for {opType.FullName}: {ex.Message}. Fallback to canonical.", ex);
            logger.LogWarning(ex, "[WS] Route discovery failed for {Type}", opType.FullName);
        }

        return new[] { canonicalWsRoute };
    }

    public static void ListAllOperations(WebApplication app)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Operations.Rest");
        var relevantAssemblies = GetRelevantAssemblies(logger);
        var httpOps = new List<Type>();
        var hubOps = new List<Type>();

        foreach (var assembly in relevantAssemblies)
        {
            try
            {
                foreach (var t in assembly.GetTypes())
                {
                    if (!(t.IsClass && !t.IsAbstract)) continue;
                    if (!(t.Namespace?.Contains(".Operations.") == true || t.Namespace?.EndsWith(".Operations") == true)) continue;

                    if (ImplementsHttpOperation(t)) httpOps.Add(t);
                    if (ImplementsHubOperation(t)) hubOps.Add(t);
                }
            }
            catch (ReflectionTypeLoadException ex)
            {
                logger.LogWarning("[RTL] {Assembly}", assembly.FullName);
                foreach (var e in ex.LoaderExceptions ?? Array.Empty<Exception>())
                    logger.LogWarning("    {Message}", e.Message);
            }
        }

        logger.LogInformation(">> Registered HTTP operations:");
        if (httpOps.Count > 0)
        {
            foreach (var type in httpOps)
            {
                try
                {
                    var routeAttr = type.GetCustomAttribute<OperationRouteAttribute>();
                    var methodAttr = type.GetCustomAttribute<OperationMethodAttribute>();
                    var groupName = OperationGroupAttribute.GetGroupName(type);
                    var operationName = type.Name.Replace("Operation", "").ToLowerInvariant();

                    var route = routeAttr?.Route ?? $"{groupName.ToLowerInvariant()}/{operationName}";
                    var method = methodAttr?.HttpMethod ?? "POST";
                    logger.LogInformation(" - [{Method}] /api/{Route} => {Type}", method, route, type.FullName);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "[Error] List {Type}", type.FullName);
                }
            }
        }
        else
        {
            logger.LogInformation("No HTTP Operations Found...");
        }

        logger.LogInformation(">> Registered Hub operations (dispatch via /ws/ops hub):");
        if (hubOps.Count > 0)
        {
            foreach (var type in hubOps)
            {
                try
                {
                    var wsRoute = GetCanonicalRoute(type);
                    logger.LogInformation(" - /ws/{WsRoute}  (stub: POST {Stub})  => {Type}",
                        wsRoute, $"{WsStubPrefix}{wsRoute}", type.FullName);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "[Error] Hub List {Type}", type.FullName);
                }
            }
        }
        else
        {
            logger.LogInformation("No Hub Operations Found...");
        }
    }

    // ---------- helpers ----------

    private static bool ImplementsHttpOperation(Type t)
        => t.GetInterfaces().Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IOperation<,>));

    private static bool ImplementsStreamOperation(Type t)
        => t.GetInterfaces().Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IStreamOperation<,>));

    private static bool ImplementsHubOperation(Type t)
        => t.GetInterfaces().Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IHubOperation<>));

    private static bool IsHttpOperation(Type t)
        => t is { IsClass: true, IsAbstract: false } &&
           (t.Namespace?.Contains(".Operations.") == true || t.Namespace?.EndsWith(".Operations") == true) &&
           ImplementsHttpOperation(t);

    private static bool IsStreamOperation(Type t)
        => t is { IsClass: true, IsAbstract: false } &&
           (t.Namespace?.Contains(".Operations.") == true || t.Namespace?.EndsWith(".Operations") == true) &&
           ImplementsStreamOperation(t);

    private static bool IsHubOperation(Type t)
        => t is { IsClass: true, IsAbstract: false } &&
           (t.Namespace?.Contains(".Operations.") == true || t.Namespace?.EndsWith(".Operations") == true) &&
           ImplementsHubOperation(t);

    private static IEnumerable<Assembly> GetRelevantAssemblies(ILogger logger)
    {
        var results = new Dictionary<string, Assembly>(StringComparer.OrdinalIgnoreCase);

        var dep = DependencyContext.Default;
        if (dep is not null)
        {
            foreach (var lib in dep.CompileLibraries.Where(l => string.Equals(l.Type, "project", StringComparison.OrdinalIgnoreCase)))
            {
                try
                {
                    var asm = AssemblyLoadContext.Default.LoadFromAssemblyName(new AssemblyName(lib.Name));
                    if (!results.ContainsKey(asm.GetName().Name!))
                        results.Add(asm.GetName().Name!, asm);
                }
                catch { /* union with already-loaded below */ }
            }
        }

        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            if (asm.IsDynamic) continue;

            var name = asm.GetName().Name ?? string.Empty;
            if (name.StartsWith("System.", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.StartsWith("Microsoft.", StringComparison.OrdinalIgnoreCase)) continue;

            if (!results.ContainsKey(name)) results.Add(name, asm);
        }

        foreach (var a in results.Values)
            logger.LogDebug("[OperationExtensions] Scanning assembly: {Asm}", a.GetName().Name);

        return results.Values;
    }

    private static string GetCanonicalRoute(Type opType)
    {
        var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
        var groupName = OperationGroupAttribute.GetGroupName(opType);
        var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();
        var path = routeAttr != null ? routeAttr.Route.Trim().TrimStart('/') : $"{groupName.ToLowerInvariant()}/{operationName}";
        return path;
    }

    private static string[] GetCanonicalSegments(Type opType)
        => GetCanonicalRoute(opType).Split('/', StringSplitOptions.RemoveEmptyEntries);

    private static (string ResourceName, string ResourceRoot, int VariantRank) GetResourceInfo(Type opType)
    {
        var segs = GetCanonicalSegments(opType);
        var first = segs.FirstOrDefault() ?? string.Empty;
        var root = first.Split('-', 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? first;
        var variantRank = first.Equals(root, StringComparison.OrdinalIgnoreCase) ? 0 : 1;
        return (first, root, variantRank);
    }

    private static string[] GetRelativeSegments(Type opType)
    {
        var segs = GetCanonicalSegments(opType);
        return segs.Length > 0 ? segs.Skip(1).ToArray() : Array.Empty<string>();
    }

    private static void ApplyAuth(RouteHandlerBuilder builder, OperationAuthorizeAttribute? authAttr)
    {
        if (authAttr is null) return;
        if (!string.IsNullOrWhiteSpace(authAttr.Policy)) builder.RequireAuthorization(authAttr.Policy);
        else builder.RequireAuthorization();
    }

    private static IList<Type> SortForStableRegistration(IEnumerable<Type> opTypes)
    {
        return opTypes
            .Select(t =>
            {
                var group = OperationGroupAttribute.GetGroup(t);
                var (resourceName, resourceRoot, variantRank) = GetResourceInfo(t);
                var segs = GetRelativeSegments(t);
                var depth = segs.Length;
                var first = segs.ElementAtOrDefault(0) ?? string.Empty;
                var last = segs.LastOrDefault() ?? string.Empty;

                int Rank(string seg) => seg.ToLowerInvariant() switch
                {
                    "get" => 0,
                    "list" => 1,
                    "create" => 2,
                    "update" => 3,
                    "delete" => 4,
                    _ => 100
                };
                var headRank = Rank(first);
                var tailRank = Rank(last);
                var inBase = headRank < 100 || (depth == 1 && tailRank < 100);
                var familyRank = inBase ? (headRank < 100 ? headRank : tailRank) : 999;

                return new
                {
                    Type = t,
                    Group = group,
                    ResourceRoot = resourceRoot,
                    VariantRank = variantRank,
                    ResourceName = resourceName,
                    InBase = inBase,
                    FamilyRank = familyRank,
                    Canonical = GetCanonicalRoute(t)
                };
            })
            .OrderBy(x => x.Group.Pinned ? 0 : 1)
            .ThenBy(x => x.Group.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.ResourceRoot, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.VariantRank)
            .ThenBy(x => x.ResourceName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.InBase ? 0 : 1)
            .ThenBy(x => x.InBase ? x.FamilyRank : 999)
            .ThenBy(x => x.Canonical, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.Type.Name, StringComparer.OrdinalIgnoreCase)
            .Select(x => x.Type)
            .ToList();
    }

    private static void LogInternal(ILogger? logger, string message, Exception? ex = null)
    {
        if (!LOG_INTERNALS) return;
        try { Console.WriteLine(message); } catch { }
        if (logger is null) return;
        if (ex is null) logger.LogInformation(message);
        else logger.LogInformation(ex, message);
    }

    // ---------- local helpers & nested types ----------

    private static string BuildPartitionKey(HttpContext ctx, bool byUserThenIp, bool includeRoute)
    {
        var userId = ctx.User?.FindFirst("sub")?.Value;
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var route = includeRoute ? (ctx.Request.Path.HasValue ? ctx.Request.Path.Value : "/") : "";
        var key = byUserThenIp && !string.IsNullOrWhiteSpace(userId) ? $"u:{userId}" : $"ip:{ip}";
        return string.IsNullOrWhiteSpace(route) ? key : $"{key}|{route!.ToLowerInvariant()}";
    }

    private sealed class TwoTypes<T1, T2> { }
}
