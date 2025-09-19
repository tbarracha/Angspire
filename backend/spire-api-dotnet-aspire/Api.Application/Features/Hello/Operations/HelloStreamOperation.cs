using Microsoft.Extensions.Logging;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;
using System.Runtime.CompilerServices;

namespace Genspire.Application.Features.Hello.Operations;
public sealed class HelloRequest : IUserScopedRequest
{
    public string? UserId { get; set; }
    public string? Name { get; set; }
}

public sealed class HelloStreamFrame : IStreamedDto
{
    public string? RequestId { get; set; }
    public int? Sequence { get; set; }
    public bool IsFinished { get; set; }
    public string? FinishReason { get; set; }
    public string Message { get; init; } = string.Empty; // single char per frame
}

[OperationRoute("hello")] // => /api/hello/stream
public sealed class HelloStreamOperation : StreamableOperationBase<HelloRequest, HelloStreamFrame>
{
    private readonly ILogger<HelloStreamOperation> _log;
    public HelloStreamOperation(IStreamAbortRegistry registry, ILogger<HelloStreamOperation> log) : base(registry) => _log = log;
    protected override Task OnBeforeAsync(HelloRequest req, CancellationToken ct = default)
    {
        _log.LogInformation("Hello-stream START | UserId={UserId} | Name={Name}", string.IsNullOrWhiteSpace(req.UserId) ? "<anon>" : req.UserId, req.Name ?? "null");
        return Task.CompletedTask;
    }

    protected override Task OnAfterAsync(HelloRequest req, CancellationToken ct = default)
    {
        _log.LogInformation("Hello-stream COMPLETE");
        return Task.CompletedTask;
    }

    protected override Task<bool> AuthorizeAsync(HelloRequest req, CancellationToken ct = default) => Task.FromResult(true);
    protected override Task<IReadOnlyList<string>?> ValidateAsync(HelloRequest req, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<string>?>(null);
    protected override async IAsyncEnumerable<HelloStreamFrame> ExecuteStreamAsync(HelloRequest req, string requestId, int nextSequence, [EnumeratorCancellation] CancellationToken ct)
    {
        var target = string.IsNullOrWhiteSpace(req.Name) ? "World" : req.Name!.Trim();
        var full = $"Hello, {target}!";
        foreach (var ch in full)
        {
            // If cancelled, emit a noop frame so the base sees it and sends the "cancelled" terminal frame.
            if (ct.IsCancellationRequested)
            {
                yield return new HelloStreamFrame(); // payload-less trigger
                yield break;
            }

            // Normal char frame
            yield return new HelloStreamFrame
            {
                Message = ch.ToString()
            };
            // Small cadence; don't pass ct to avoid OperationCanceledException in an iterator
            await Task.Delay(50);
        }
    }
}