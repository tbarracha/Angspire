// File: SpireCore/API/Operations/Streaming/IStreamAbortRegistry.cs
namespace SpireCore.API.Operations.Streaming;

public interface IStreamAbortRegistry
{
    bool TryRegister(string requestId, CancellationTokenSource cts);
    bool Cancel(string requestId);
    void Remove(string requestId);
    bool IsRegistered(string requestId);

    /// Try snapshot count (diagnostics)
    int Count { get; }
}
