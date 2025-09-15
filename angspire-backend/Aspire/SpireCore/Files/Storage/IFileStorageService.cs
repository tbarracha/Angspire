// File: SpireCore.Files.Storage/IFileStorage.cs
using System.Buffers;

namespace SpireCore.Files.Storage;

/* ===========================
 * Core IDs & Metadata
 * =========================== */

/// Neutral identifier for an object in any storage provider.
public sealed record StorageObjectId(string Container, string Key)
{
    public override string ToString() => $"{Container}:{Key}";
}

/// Provider-agnostic object metadata.
public sealed record StorageObjectInfo(
    StorageObjectId Id,
    long? SizeBytes,                                // may be unknown before upload completes
    string ContentType,                             // explicit MIME type
    string? ETag,
    string? Sha256,
    DateTimeOffset? LastModifiedUtc,
    IReadOnlyDictionary<string, string>? Metadata
);

/* ===========================
 * Streaming Shapes
 * =========================== */

/// Frame yielded on download. First frame carries Info; subsequent frames carry Data.
public sealed class StorageReadFrame
{
    public bool IsFirst { get; init; }
    public bool IsLast { get; init; }
    public long Offset { get; init; }              // starting byte offset for this chunk
    public ReadOnlyMemory<byte>? Data { get; init; }// null on metadata-only frames
    public StorageObjectInfo? Info { get; init; }   // present on first frame

    public string? Message { get; init; }
}

/// Descriptor for an upload (target + MIME + optional metadata).
public sealed class StorageWriteDescriptor
{
    public required StorageObjectId Target { get; init; }
    public required string ContentType { get; init; } = "application/octet-stream"; // MIME
    public IReadOnlyDictionary<string, string>? Metadata { get; init; }

    /// Hint: preferred chunk/part size that the caller plans to push (bytes).
    public int? PreferredChunkSizeBytes { get; init; }
    /// Ask provider to compute SHA-256 server-side while ingesting.
    public bool ComputeSha256 { get; init; } = true;
}

/// Provider’s acknowledgement/progress during upload.
public sealed class StorageWriteAck
{
    public long BytesAccepted { get; init; }        // cumulative bytes stored
    public int? PartNumber { get; init; }           // if provider segments internally
    public string? Message { get; init; }           // optional progress note
    public bool IsCompleted { get; init; }          // true on final ack
    public StorageObjectInfo? FinalInfo { get; init; } // present on completion
}

/* ===========================
 * Provider Abstraction
 * =========================== */

public interface IFileStorageService
{
    string ProviderKey { get; }

    /* ---- Containers / CRUD-metadata ---- */

    Task<bool> ContainerExistsAsync(string container, CancellationToken ct = default);
    Task EnsureContainerAsync(string container, CancellationToken ct = default);

    Task<StorageObjectInfo?> GetInfoAsync(StorageObjectId id, CancellationToken ct = default);

    /// Streams object listings (provider should paginate/stream internally).
    IAsyncEnumerable<StorageObjectInfo> ListAsync(
        string container,
        string? prefix = null,
        CancellationToken ct = default);

    Task<bool> DeleteAsync(StorageObjectId id, CancellationToken ct = default);
    Task<int> DeleteManyAsync(string container, IEnumerable<string> keys, CancellationToken ct = default);

    /* ---- Download (egress streaming) ---- */

    /// Streams the object as frames; first frame contains Info (with MIME), then data chunks.
    IAsyncEnumerable<StorageReadFrame> ReadAsync(
        StorageObjectId id,
        int chunkSizeBytes = 256 * 1024,
        CancellationToken ct = default);

    /* ---- Upload (ingress streaming) ---- */

    /// Streams data into the provider. Caller pushes raw chunks; provider yields progress + final info.
    /// - The first ack may contain provider-specific negotiation details (e.g., chosen part size).
    /// - The final ack MUST have IsCompleted=true and FinalInfo filled.
    IAsyncEnumerable<StorageWriteAck> WriteAsync(
        StorageWriteDescriptor descriptor,
        IAsyncEnumerable<ReadOnlyMemory<byte>> chunks,
        CancellationToken ct = default);
}

/* ===========================
 * Optional Base (helpers)
 * =========================== */

public abstract class FileStorageServiceBase : IFileStorageService
{
    public abstract string ProviderKey { get; }

    public abstract Task<bool> ContainerExistsAsync(string container, CancellationToken ct = default);
    public abstract Task EnsureContainerAsync(string container, CancellationToken ct = default);
    public abstract Task<StorageObjectInfo?> GetInfoAsync(StorageObjectId id, CancellationToken ct = default);
    public abstract IAsyncEnumerable<StorageObjectInfo> ListAsync(string container, string? prefix = null, CancellationToken ct = default);
    public abstract Task<bool> DeleteAsync(StorageObjectId id, CancellationToken ct = default);
    public abstract Task<int> DeleteManyAsync(string container, IEnumerable<string> keys, CancellationToken ct = default);

    public virtual async IAsyncEnumerable<StorageReadFrame> ReadAsync(
    StorageObjectId id,
    int chunkSizeBytes = 256 * 1024,
    [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        if (chunkSizeBytes < 16 * 1024) chunkSizeBytes = 16 * 1024;
        if (chunkSizeBytes > 2 * 1024 * 1024) chunkSizeBytes = 2 * 1024 * 1024;

        var info = await GetInfoAsync(id, ct)
                   ?? throw new FileNotFoundException($"Object not found: {id}");

        // START frame (metadata-first)
        yield return new StorageReadFrame
        {
            IsFirst = true,
            IsLast = info.SizeBytes == 0,
            Offset = 0,
            Info = info,
            Message = "start"
        };

        if (info.SizeBytes == 0) yield break;

        await foreach (var frame in ReadStreamChunksAsync(id, chunkSizeBytes, ct))
            yield return frame;
    }

    protected virtual async IAsyncEnumerable<StorageReadFrame> ReadStreamChunksAsync(
        StorageObjectId id,
        int chunkSizeBytes,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        await using var stream = await OpenReadCoreAsync(id, ct);
        var buffer = ArrayPool<byte>.Shared.Rent(chunkSizeBytes);
        try
        {
            long offset = 0;
            int read;
            while ((read = await stream.ReadAsync(buffer.AsMemory(0, chunkSizeBytes), ct)) > 0)
            {
                yield return new StorageReadFrame
                {
                    IsFirst = false,
                    IsLast = false,
                    Offset = offset,
                    Data = buffer.AsMemory(0, read),
                    Message = "progress"
                };
                offset += read;
            }

            // COMPLETE frame (no data)
            yield return new StorageReadFrame
            {
                IsFirst = false,
                IsLast = true,
                Offset = offset,
                Message = "completed"
            };
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    /// Provider must implement a raw readable stream fetch.
    protected abstract Task<Stream> OpenReadCoreAsync(StorageObjectId id, CancellationToken ct);

    public abstract IAsyncEnumerable<StorageWriteAck> WriteAsync(
        StorageWriteDescriptor descriptor,
        IAsyncEnumerable<ReadOnlyMemory<byte>> chunks,
        CancellationToken ct = default);
}
