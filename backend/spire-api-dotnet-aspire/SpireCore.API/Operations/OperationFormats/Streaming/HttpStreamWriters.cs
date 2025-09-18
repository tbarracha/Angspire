// ============================================================================
// Streaming writers (NDJSON + SSE) from IAsyncEnumerable<T>
// File: SpireCore.API.Operations/Streaming/HttpStreamWriters.cs
// ============================================================================
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace SpireCore.API.Operations.Streaming;

public static class HttpStreamWriters
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

    public static async Task WriteNdjsonAsync<TFrame>(HttpContext ctx, IAsyncEnumerable<TFrame> frames, CancellationToken ct)
    {
        ctx.Response.Headers.CacheControl = "no-store, no-transform";
        ctx.Response.ContentType = "application/x-ndjson; charset=utf-8";

        await foreach (var f in frames.WithCancellation(ct))
        {
            var json = JsonSerializer.Serialize(f, Json);
            await ctx.Response.WriteAsync(json, ct);
            await ctx.Response.WriteAsync("\n", ct);
            await ctx.Response.Body.FlushAsync(ct);
        }
    }

    public static async Task WriteSseAsync<TFrame>(HttpContext ctx, IAsyncEnumerable<TFrame> frames, CancellationToken ct, string eventName = "message")
    {
        ctx.Response.Headers.CacheControl = "no-store, no-transform";
        ctx.Response.Headers["X-Accel-Buffering"] = "no"; // Nginx: disable response buffering
        ctx.Response.ContentType = "text/event-stream; charset=utf-8";

        // initial comment to open the stream quickly
        await ctx.Response.WriteAsync($": ok\n\n", ct);
        await ctx.Response.Body.FlushAsync(ct);

        await foreach (var f in frames.WithCancellation(ct))
        {
            var data = JsonSerializer.Serialize(f, Json);
            // Minimal SSE frame
            await ctx.Response.WriteAsync($"event: {eventName}\n", ct);
            await ctx.Response.WriteAsync($"data: {data}\n\n", ct);
            await ctx.Response.Body.FlushAsync(ct);
        }

        // end-of-stream comment (optional)
        await ctx.Response.WriteAsync($": done\n\n", ct);
    }

    public static bool WantsSse(HttpContext ctx)
        => (ctx.Request.Headers.Accept.ToString()?.Contains("text/event-stream", StringComparison.OrdinalIgnoreCase) ?? false);
}
