// File: SpireCore.Files.Storage/IUploadSessionStore.cs
namespace SpireCore.Files.Storage;

public interface IUploadSessionStore
{
    Task<string> CreateAsync(UploadSessionInit init, CancellationToken ct);
    Task<bool> ExistsAsync(string uploadId, CancellationToken ct);
    Task<long> AppendAsync(string uploadId, long offset, Stream src, CancellationToken ct);
    Task<(long BytesReceived, long? Total)> GetProgressAsync(string uploadId, CancellationToken ct);
    Task<UploadSessionInfo> GetInfoAsync(string uploadId, CancellationToken ct);
    IAsyncEnumerable<ReadOnlyMemory<byte>> ReadAsChunks(string uploadId, int chunkSize, CancellationToken ct);
    Task DeleteAsync(string uploadId, CancellationToken ct);
}

public sealed class UploadSessionInit
{
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
    public required string TargetContainer { get; init; }
    public long? TotalLength { get; init; }
}

public sealed record UploadSessionInfo(
    string UploadId,
    string FileName,
    string ContentType,
    string TargetContainer,
    long? TotalLength,
    string TempPath);
