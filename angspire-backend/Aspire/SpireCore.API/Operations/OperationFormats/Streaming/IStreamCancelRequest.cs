// File: SpireCore/API/Operations/Streaming/CancelStream.Abstractions.cs
namespace SpireCore.API.Operations.Streaming;

public interface IStreamCancelRequest
{
    string? RequestId { get; }
}

public interface IStreamCancelResponse
{
    bool Cancelled { get; set; }
}

public sealed class StreamCancelRequest : IStreamCancelRequest
{
    public required string RequestId { get; init; }
}

public sealed class StreamCancelResponse : IStreamCancelResponse
{
    public bool Cancelled { get; set; }
    public string? Message { get; set; }
}