using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;

namespace Genspire.Application.Modules.Streaming.Operations;
[OperationRoute("stream/cancel")]
public sealed class CancelStreamOperation : OperationBase<CancelStreamRequest, CancelStreamResponse>
{
    private readonly IStreamAbortRegistry _registry;
    public CancelStreamOperation(IStreamAbortRegistry registry) => _registry = registry;
    protected override Task<CancelStreamResponse> HandleAsync(CancelStreamRequest request) => Task.FromResult(new CancelStreamResponse { Success = !string.IsNullOrWhiteSpace(request.RequestId) && _registry.Cancel(request.RequestId!.Trim()) });
}

public sealed class CancelStreamRequest
{
    public required string RequestId { get; set; }
}

public sealed class CancelStreamResponse
{
    public bool Success { get; set; }
}