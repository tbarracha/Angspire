using Microsoft.AspNetCore.Mvc;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;
using SpireCore.API.Operations.WebSockets;
using System.Net.WebSockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;

public static class OperationsExtensions
{
    public static void AddOperations(this IServiceCollection services)
    {
        services.Scan(scan => scan
            .FromApplicationDependencies()
            .AddClasses(c => c.AssignableToAny(
                typeof(IOperation<,>),
                typeof(IStreamableOperation<,>),
                typeof(IWebSocketOperation<>)))
            .AsSelf()
            .AsImplementedInterfaces()
            .WithTransientLifetime());

        services.AddScoped<OperationMiddleware>();
    }

    public static RouteHandlerBuilder MapOperation<TOp, TReq, TRes>(
        WebApplication app, string route, string method)
        where TOp : IOperation<TReq, TRes>
    {
        var groupAttr = typeof(TOp).GetCustomAttribute<OperationGroupAttribute>();
        var groupName = OperationGroupAttribute.GetGroupName(typeof(TOp));
        var uniqueName = $"{groupName}_{typeof(TOp).Name}_{method}_stream_{Guid.NewGuid():N}";

        var builder = method switch
        {
            "GET" => app.MapGet(route, async (
                [FromServices] OperationMiddleware middleware,
                [FromServices] TOp op,
                [AsParameters] TReq req) =>
            {
                return await middleware.ExecuteAsync(op, req);
            }),

            "DELETE" => app.MapDelete(route, async (
                [FromServices] OperationMiddleware middleware,
                [FromServices] TOp op,
                [AsParameters] TReq req) =>
            {
                return await middleware.ExecuteAsync(op, req);
            }),

            "PUT" => app.MapPut(route, async (
                [FromServices] OperationMiddleware middleware,
                [FromServices] TOp op,
                [FromBody] TReq req) =>
            {
                return await middleware.ExecuteAsync(op, req);
            }),

            _ => app.MapPost(route, async (
                [FromServices] OperationMiddleware middleware,
                [FromServices] TOp op,
                [FromBody] TReq req) =>
            {
                return await middleware.ExecuteAsync(op, req);
            })
        };

        builder.WithName(uniqueName);

        var producesFileAttr = typeof(TOp).GetCustomAttribute<OperationProducesFileAttribute>();
        if (producesFileAttr is not null)
        {
            builder.Produces(
                StatusCodes.Status200OK,
                typeof(FileResult),
                producesFileAttr.ContentType
            );

            builder.WithOpenApi(op =>
            {
                op.Responses["200"].Description = $"Returns a file download ({producesFileAttr.ContentType})";
                op.Responses["200"].Content.Clear();
                op.Responses["200"].Content.Add(producesFileAttr.ContentType, new Microsoft.OpenApi.Models.OpenApiMediaType());
                return op;
            });
        }
        else
        {
            builder.Produces<TRes>(StatusCodes.Status200OK);
            builder.WithOpenApi(op =>
            {
                op.Responses["200"].Description = $"Success ({typeof(TRes).Name})";
                return op;
            });
        }

        return builder;
    }

    public static RouteHandlerBuilder MapStreamableOperation<TOp, TReq, TRes>(
        WebApplication app, string route, string method)
        where TOp : IStreamableOperation<TReq, TRes>
    {
        var groupName = OperationGroupAttribute.GetGroupName(typeof(TOp));
        var uniqueName = $"{groupName}_{typeof(TOp).Name}_{method}_stream_{Guid.NewGuid():N}";

        static async Task WriteNdjsonAsync<T>(
            IAsyncEnumerable<T> stream,
            HttpResponse resp,
            CancellationToken ct)
        {
            try
            {
                await foreach (var item in stream.WithCancellation(ct))
                {
                    var json = JsonSerializer.Serialize(item);
                    await resp.WriteAsync(json + "\n", ct);
                    await resp.Body.FlushAsync(ct);
                }
            }
            catch (OperationCanceledException)
            {
                // Normal: client disconnected or cancel requested
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[NDJSON stream error] {ex}");
                throw;
            }
        }

        var builder = method switch
        {
            "GET" => app.MapGet(route, async (
                [FromServices] OperationMiddleware middleware,
                [FromServices] TOp op,
                [AsParameters] TReq req,
                HttpResponse response,
                CancellationToken ct) =>
            {
                response.ContentType = "application/x-ndjson";
                await WriteNdjsonAsync(
                    middleware.StreamAsync(op, req, ct), response, ct);
            }),

            _ => app.MapPost(route, async (
                [FromServices] OperationMiddleware middleware,
                [FromServices] TOp op,
                [FromBody] TReq req,
                HttpResponse response,
                CancellationToken ct) =>
            {
                response.ContentType = "application/x-ndjson";
                await WriteNdjsonAsync(
                    middleware.StreamAsync(op, req, ct), response, ct);
            })
        };

        builder.WithName(uniqueName);

        builder.WithOpenApi(op =>
        {
            op.Responses["200"].Description = $"Streamed NDJSON ({typeof(TRes).Name})";
            return op;
        });

        return builder;
    }

    public static RouteHandlerBuilder MapWebSocketOperation<TOp, TRes>(
    WebApplication app, string route)
    where TOp : IWebSocketOperation<TRes>
    {
        // Safe to call multiple times; the runtime deduplicates middleware registrations.
        app.UseWebSockets(new WebSocketOptions
        {
            KeepAliveInterval = TimeSpan.FromSeconds(15)
        });

        var builder = app.MapGet(route, async (
            HttpContext ctx,
            [FromServices] TOp op,
            [FromServices] OperationMiddleware _ /* symmetry */,
            CancellationToken requestAborted) =>
        {
            if (!ctx.WebSockets.IsWebSocketRequest)
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using var socket = await ctx.WebSockets.AcceptWebSocketAsync(subProtocol: "json");
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(requestAborted);
            var ct = linkedCts.Token;

            // Build the inbound envelope stream (continuous reads).
            var inbound = ReadEnvelopesAsync(
                socket,
                onCancel: () => linkedCts.Cancel(),
                ct: ct);

            // Pump frames produced by the operation back to the client.
            try
            {
                await foreach (var frame in op.ConnectAsync(inbound, ct).WithCancellation(ct))
                {
                    if (socket.State != WebSocketState.Open) break;
                    await SendJsonAsync(socket, frame, ct);
                }
            }
            catch (OperationCanceledException)
            {
                // normal termination on cancel/close
            }
            finally
            {
                if (socket.State == WebSocketState.Open)
                    await SafeCloseAsync(socket, WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
            }
        });

        builder.WithOpenApi(op =>
        {
            op.Summary = $"WebSocket endpoint ({typeof(TRes).Name} frames)";
            op.Description =
                "Connect via WebSocket. Send any number of JSON envelopes `{ Type, Id, Payload }`.\n" +
                "Server responds with JSON frames. Send `{ \"Type\": \"cancel\" }` or close the socket to stop.";
            return op;
        });

        return builder;

        // ----- Local helpers -----

        // Continuous reader that yields *envelopes*; recognizes Type=="cancel" and triggers onCancel.
        static async IAsyncEnumerable<WsEnvelope> ReadEnvelopesAsync(
            WebSocket ws,
            Action onCancel,
            [EnumeratorCancellation] CancellationToken ct)
        {
            var buffer = new byte[64 * 1024];
            var seg = new ArraySegment<byte>(buffer);

            while (!ct.IsCancellationRequested && ws.State == WebSocketState.Open)
            {
                // Accumulate a full text message
                var sb = new StringBuilder();
                WebSocketReceiveResult result;
                do
                {
                    result = await ws.ReceiveAsync(seg, ct);
                    if (result.MessageType == WebSocketMessageType.Close)
                        yield break;

                    if (result.MessageType != WebSocketMessageType.Text)
                        continue;

                    sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                }
                while (!result.EndOfMessage);

                var json = sb.ToString();

                // Try to deserialize into an envelope; ignore malformed frames
                WsEnvelope? env = null;
                try { env = System.Text.Json.JsonSerializer.Deserialize<WsEnvelope>(json); }
                catch { /* ignore */ }

                if (env is null)
                    continue;

                // Soft control: allow client to cancel via envelope
                if (string.Equals(env.Type, "cancel", StringComparison.OrdinalIgnoreCase))
                {
                    onCancel();
                    continue;
                }

                yield return env;
            }
        }

        static Task SendJsonAsync<T>(WebSocket ws, T payload, CancellationToken ct)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(payload);
            var bytes = Encoding.UTF8.GetBytes(json);
            return ws.SendAsync(bytes, WebSocketMessageType.Text, endOfMessage: true, ct);
        }

        static Task SafeCloseAsync(WebSocket ws, WebSocketCloseStatus status, string reason, CancellationToken ct)
            => ws.CloseAsync(status, reason, ct);
    }


    private record WsControl(string? Type);

    /// <summary>
    /// Returns only assemblies relevant to Spire operation discovery.
    /// </summary>
    private static IEnumerable<Assembly> GetRelevantAssemblies()
    {
        return AppDomain.CurrentDomain
            .GetAssemblies()
            .Where(a =>
                a.GetName().Name != null &&
                (a.GetName().Name.Contains("Genspire"))
            );
    }

    /// <summary>
    /// Gets a group name for an operation type, prioritizing attribute and then namespace segment.
    /// </summary>
    private static string GetOperationGroupName(Type type)
        => OperationGroupAttribute.GetGroupName(type);

    private static string GetCanonicalRoute(Type opType)
    {
        var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
        var groupName = OperationGroupAttribute.GetGroupName(opType);
        var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();

        var path = routeAttr != null
            ? routeAttr.Route.Trim().TrimStart('/')
            : $"{groupName.ToLowerInvariant()}/{operationName}";

        return path; // e.g., "provider/model/create"
    }

    private static int GetVerbRank(string? segment)
    {
        if (string.IsNullOrWhiteSpace(segment)) return 100;
        return segment.ToLowerInvariant() switch
        {
            "get" => 0,
            "list" => 1,
            "create" => 2,
            "update" => 3,
            "delete" => 4,
            _ => 100
        };
    }

    private static bool IsKnownVerb(string? seg)
    {
        if (string.IsNullOrWhiteSpace(seg)) return false;
        return GetVerbInfo(seg).VerbRank < 100;
    }

    private static (int VerbRank, string VerbFamily, int VerbVariantRank) GetVerbInfo(string? segment)
    {
        if (string.IsNullOrWhiteSpace(segment))
            return (100, segment ?? string.Empty, 0);

        var lower = segment.ToLowerInvariant();
        var families = new[] { "get", "list", "create", "update", "delete" };

        for (int i = 0; i < families.Length; i++)
        {
            var fam = families[i];
            if (lower == fam) return (i, fam, 0);
            if (lower.StartsWith(fam + "-", StringComparison.OrdinalIgnoreCase)) return (i, fam, 1);
        }

        return (100, lower, 0);
    }

    private static string[] GetCanonicalSegments(Type opType)
    {
        var path = GetCanonicalRoute(opType);
        return path.Split('/', StringSplitOptions.RemoveEmptyEntries);
    }

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

    private static bool IsStreamable(Type opType) =>
        opType.GetInterfaces().Any(i => i.IsGenericType &&
            i.GetGenericTypeDefinition() == typeof(IStreamableOperation<,>));

    private static bool IsWebSocketOp(Type opType) =>
        opType.GetInterfaces().Any(i => i.IsGenericType &&
            i.GetGenericTypeDefinition() == typeof(IWebSocketOperation<>));

    private static string GetWsRoute(Type opType)
    {
        var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
        var groupName = OperationGroupAttribute.GetGroupName(opType);
        var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();

        var path = routeAttr != null
            ? routeAttr.Route.Trim().TrimStart('/')
            : $"{groupName.ToLowerInvariant()}/{operationName}";

        return $"/ws/{path}";
    }

    private static void ApplyAuth(RouteHandlerBuilder builder, OperationAuthorizeAttribute? authAttr)
    {
        if (authAttr is null) return;
        if (!string.IsNullOrWhiteSpace(authAttr.Policy))
            builder.RequireAuthorization(authAttr.Policy);
        else
            builder.RequireAuthorization();
    }

    public static void MapAllOperations(this WebApplication app)
    {
        try
        {
            var relevantAssemblies = GetRelevantAssemblies();

            var opTypes = new List<Type>();
            foreach (var assembly in relevantAssemblies)
            {
                try
                {
                    opTypes.AddRange(
                        assembly.GetTypes().Where(t =>
                            t.IsClass &&
                            !t.IsAbstract &&
                            (t.Namespace?.Contains(".Operations.") == true || t.Namespace?.Contains(".Operations") == true) &&
                            (t.GetInterfaces().Any(i =>
                                i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IOperation<,>)) ||
                             t.GetInterfaces().Any(i =>
                                i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IStreamableOperation<,>)) ||
                             t.GetInterfaces().Any(i =>
                                i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IWebSocketOperation<>)))
                        )
                    );
                }
                catch (ReflectionTypeLoadException ex)
                {
                    Console.WriteLine($"[ReflectionTypeLoadException] Failed to load types from assembly: {assembly.FullName}");
                    foreach (var loaderEx in ex.LoaderExceptions ?? Array.Empty<Exception>())
                    {
                        if (loaderEx != null)
                        {
                            Console.WriteLine("    [LoaderException] " + loaderEx.GetType().FullName + ": " + loaderEx.Message);
                            if (loaderEx is FileNotFoundException fnf)
                            {
                                Console.WriteLine("        FileName: " + fnf.FileName);
                                Console.WriteLine("        FusionLog: " + fnf.FusionLog);
                            }
                        }
                    }
                }
            }

            var sortedOpTypes = opTypes
                .Select(t =>
                {
                    var group = OperationGroupAttribute.GetGroup(t);
                    var (resourceName, resourceRoot, variantRank) = GetResourceInfo(t);

                    var segs = GetRelativeSegments(t);
                    var depth = segs.Length;
                    var first = segs.ElementAtOrDefault(0) ?? string.Empty;
                    var second = segs.ElementAtOrDefault(1) ?? string.Empty;
                    var last = segs.LastOrDefault() ?? string.Empty;

                    var head = GetVerbInfo(first);
                    var tail = GetVerbInfo(last);
                    var headIsV = head.VerbRank < 100;
                    var tailIsV = tail.VerbRank < 100;

                    var inBaseScope = headIsV || (depth == 1 && tailIsV);

                    var familyRankInBase = inBaseScope
                        ? (headIsV ? head.VerbRank : tail.VerbRank)
                        : 999;

                    var isBaseVerb = inBaseScope && depth == 1 && (head.VerbVariantRank == 0 || tail.VerbVariantRank == 0);
                    var baseVsVariantInBase = inBaseScope ? (isBaseVerb ? 0 : 1) : 999;

                    var variantAlphaInBase = inBaseScope
                        ? (isBaseVerb ? "" : string.Join('/', segs.Skip(1)))
                        : "~";

                    var subKey = inBaseScope ? "~" : first;
                    var subVerbInfo = inBaseScope ? (100, "", 0) : GetVerbInfo(second);
                    var subVerbRank = inBaseScope ? 999 : subVerbInfo.Item1;
                    var subBaseVsVariant = inBaseScope ? 999 : (depth <= 2 ? 0 : 1);
                    var subVariantAlpha = inBaseScope ? "~" : (depth > 2 ? string.Join('/', segs.Skip(2)) : "");

                    return new
                    {
                        Type = t,
                        Group = group,

                        ResourceRoot = resourceRoot,
                        VariantRank = variantRank,
                        ResourceName = resourceName,

                        InBaseScope = inBaseScope,

                        FamilyRankInBase = familyRankInBase,
                        BaseVsVariantInBase = baseVsVariantInBase,
                        VariantAlphaInBase = variantAlphaInBase,

                        SubKey = subKey,
                        SubVerbRank = subVerbRank,
                        SubBaseVsVariant = subBaseVsVariant,
                        SubVariantAlpha = subVariantAlpha,

                        Canonical = GetCanonicalRoute(t),
                        Stream = IsStreamable(t),
                        Ws = IsWebSocketOp(t)
                    };
                })
                .OrderBy(x => x.Group.Pinned ? 0 : 1)
                .ThenBy(x => x.Group.Name, StringComparer.OrdinalIgnoreCase)

                .ThenBy(x => x.ResourceRoot, StringComparer.OrdinalIgnoreCase)
                .ThenBy(x => x.VariantRank)
                .ThenBy(x => x.ResourceName, StringComparer.OrdinalIgnoreCase)

                .ThenBy(x => x.InBaseScope ? 0 : 1)
                .ThenBy(x => x.InBaseScope ? x.FamilyRankInBase : 999)
                .ThenBy(x => x.InBaseScope ? x.BaseVsVariantInBase : 999)
                .ThenBy(x => x.InBaseScope ? x.VariantAlphaInBase : "~", StringComparer.OrdinalIgnoreCase)

                .ThenBy(x => x.InBaseScope ? "~" : x.SubKey, StringComparer.OrdinalIgnoreCase)
                .ThenBy(x => x.InBaseScope ? 999 : x.SubVerbRank)
                .ThenBy(x => x.InBaseScope ? 999 : x.SubBaseVsVariant)
                .ThenBy(x => x.InBaseScope ? "~" : x.SubVariantAlpha, StringComparer.OrdinalIgnoreCase)

                .ThenBy(x => x.Stream ? 1 : 0)
                .ThenBy(x => x.Ws ? 1 : 0)
                .ThenBy(x => x.Canonical, StringComparer.OrdinalIgnoreCase)
                .ThenBy(x => x.Type.Name, StringComparer.OrdinalIgnoreCase)
                .Select(x => x.Type)
                .ToList();

            foreach (var opType in sortedOpTypes)
            {
                try
                {
                    var isHidden = opType.IsDefined(typeof(OperationHiddenAttribute), inherit: false);

                    var classicIface = opType.GetInterfaces()
                        .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IOperation<,>));
                    var streamIface = opType.GetInterfaces()
                        .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IStreamableOperation<,>));
                    var wsIface = opType.GetInterfaces()
                        .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IWebSocketOperation<>));

                    // ----- Classic -----
                    if (classicIface != null)
                    {
                        var requestType = classicIface.GetGenericArguments()[0];
                        var responseType = classicIface.GetGenericArguments()[1];

                        var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
                        var methodAttr = opType.GetCustomAttribute<OperationMethodAttribute>();
                        var authAttr = opType.GetCustomAttribute<OperationAuthorizeAttribute>();

                        var groupName = GetOperationGroupName(opType);
                        var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();

                        var route = routeAttr != null
                            ? $"/api/{routeAttr.Route}"
                            : $"/api/{groupName.ToLowerInvariant()}/{operationName}";

                        var httpMethod = methodAttr?.HttpMethod ?? "POST";

                        var method = typeof(OperationsExtensions)
                            .GetMethod(nameof(OperationsExtensions.MapOperation), BindingFlags.Public | BindingFlags.Static)!
                            .MakeGenericMethod(opType, requestType, responseType);

                        var endpointBuilder = (RouteHandlerBuilder)method.Invoke(null, new object[] { app, route, httpMethod })!;
                        ApplyAuth(endpointBuilder, authAttr);

                        if (isHidden) endpointBuilder.ExcludeFromDescription();
                        else endpointBuilder.WithTags(groupName);
                    }

                    // ----- Streamable -----
                    if (streamIface != null)
                    {
                        var requestType = streamIface.GetGenericArguments()[0];
                        var responseType = streamIface.GetGenericArguments()[1];

                        var routeAttr = opType.GetCustomAttribute<OperationRouteAttribute>();
                        var methodAttr = opType.GetCustomAttribute<OperationMethodAttribute>();
                        var authAttr = opType.GetCustomAttribute<OperationAuthorizeAttribute>();

                        var groupName = GetOperationGroupName(opType);
                        var operationName = opType.Name.Replace("Operation", "").ToLowerInvariant();

                        var route = routeAttr != null
                            ? $"/api/{routeAttr.Route}/stream"
                            : $"/api/{groupName.ToLowerInvariant()}/{operationName}/stream";

                        var httpMethod = methodAttr?.HttpMethod ?? "POST";

                        var method = typeof(OperationsExtensions)
                            .GetMethod(nameof(OperationsExtensions.MapStreamableOperation), BindingFlags.Public | BindingFlags.Static)!
                            .MakeGenericMethod(opType, requestType, responseType);

                        var endpointBuilder = (RouteHandlerBuilder)method.Invoke(null, new object[] { app, route, httpMethod })!;
                        ApplyAuth(endpointBuilder, authAttr);

                        if (isHidden) endpointBuilder.ExcludeFromDescription();
                        else endpointBuilder.WithTags(groupName);
                    }

                    // ----- WebSocket -----
                    if (wsIface != null)
                    {
                        var requestType = wsIface.GetGenericArguments()[0];
                        var responseType = wsIface.GetGenericArguments()[1];

                        var route = GetWsRoute(opType);
                        var authAttr = opType.GetCustomAttribute<OperationAuthorizeAttribute>();
                        var groupName = GetOperationGroupName(opType);

                        var method = typeof(OperationsExtensions)
                            .GetMethod(nameof(OperationsExtensions.MapWebSocketOperation), BindingFlags.Public | BindingFlags.Static)!
                            .MakeGenericMethod(opType, requestType, responseType);

                        var endpointBuilder = (RouteHandlerBuilder)method.Invoke(null, new object[] { app, route })!;
                        ApplyAuth(endpointBuilder, authAttr);

                        // Swagger is not ideal for WS; keep tag for grouping, optionally exclude
                        if (isHidden) endpointBuilder.ExcludeFromDescription();
                        else endpointBuilder.WithTags(groupName);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Error] Failed to map operation for type {opType.FullName}: {ex}");
                    // continue
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("[TopLevelError] Unexpected error in MapAllOperations: " + ex);
            throw;
        }
    }

    public static void ListAllOperations()
    {
        try
        {
            var relevantAssemblies = GetRelevantAssemblies();
            var opTypes = new List<Type>();
            foreach (var assembly in relevantAssemblies)
            {
                try
                {
                    opTypes.AddRange(
                        assembly.GetTypes().Where(t =>
                            t.IsClass &&
                            !t.IsAbstract &&
                            (t.Namespace?.Contains(".Operations.") == true || t.Namespace?.Contains(".Operations") == true) &&
                            t.GetInterfaces().Any(i =>
                                i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IOperation<,>)))
                    );
                }
                catch (ReflectionTypeLoadException ex)
                {
                    Console.WriteLine($"[ReflectionTypeLoadException] Failed to load types from assembly: {assembly.FullName}");
                    foreach (var loaderEx in ex.LoaderExceptions ?? Array.Empty<Exception>())
                    {
                        if (loaderEx != null)
                        {
                            Console.WriteLine("    [LoaderException] " + loaderEx.GetType().FullName + ": " + loaderEx.Message);
                            if (loaderEx is FileNotFoundException fnf)
                            {
                                Console.WriteLine("        FileName: " + fnf.FileName);
                                Console.WriteLine("        FusionLog: " + fnf.FusionLog);
                            }
                        }
                    }
                }
            }

            Console.WriteLine(">> Registered operations:");
            foreach (var type in opTypes)
            {
                try
                {
                    var routeAttr = type.GetCustomAttribute<OperationRouteAttribute>();
                    var methodAttr = type.GetCustomAttribute<OperationMethodAttribute>();

                    var groupName = GetOperationGroupName(type);

                    var operationName = type.Name.Replace("Operation", "").ToLower();
                    var route = routeAttr?.Route ?? $"{groupName.ToLower()}/{operationName}";
                    var method = methodAttr?.HttpMethod ?? "POST";

                    Console.WriteLine($" - [{method}] /api/{route} => {type.FullName}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Error] Failed to list operation for type {type.FullName}: {ex}");
                }
            }
            Console.WriteLine();
        }
        catch (Exception ex)
        {
            Console.WriteLine("[TopLevelError] Unexpected error in ListAllOperations: " + ex);
            throw;
        }
    }
}
