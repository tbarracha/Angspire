// File: SpireCore.Files.Storage/FileGateway.cs
using SpireCore.Services;
using System.Buffers;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace SpireCore.Files.Storage;

public sealed class FileGateway : IScopedService
{
    private readonly IFileStorageFactory _factory;
    public FileGateway(IFileStorageFactory factory) => _factory = factory;

    /* ===========================
     *           UPLOADS
     * =========================== */

    public async Task<StorageObjectInfo> SaveAsync(
        string container,
        string key,
        string contentType,
        IAsyncEnumerable<ReadOnlyMemory<byte>> chunks,
        FileMetadata? metadata,
        CancellationToken ct)
    {
        var storage = _factory.ForContainer(container);
        await storage.EnsureContainerAsync(container, ct);

        var desc = new StorageWriteDescriptor
        {
            Target = new StorageObjectId(container, key),
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            Metadata = Flatten(metadata),
            ComputeSha256 = true
        };

        StorageObjectInfo? final = null;
        await foreach (var ack in storage.WriteAsync(desc, chunks, ct).WithCancellation(ct))
        {
            if (ack.IsCompleted) final = ack.FinalInfo;
        }
        return final!;
    }

    public Task<StorageObjectInfo> SaveFromStreamAsync(
        string container,
        string key,
        string contentType,
        Stream src,
        FileMetadata? metadata,
        CancellationToken ct)
        => SaveAsync(container, key, contentType, StreamToChunks(src, 512 * 1024, ct), metadata, ct);

    /* ===========================
     *          DOWNLOADS
     * =========================== */

    public IAsyncEnumerable<StorageReadFrame> ReadFramesAsync(
        string container, string key, int chunkSizeBytes = 256 * 1024, CancellationToken ct = default)
        => _factory.ForContainer(container).ReadAsync(new StorageObjectId(container, key), chunkSizeBytes, ct);

    public async IAsyncEnumerable<ReadOnlyMemory<byte>> ReadBytesAsync(
        string container, string key, int chunkSizeBytes = 256 * 1024,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await foreach (var f in ReadFramesAsync(container, key, chunkSizeBytes, ct).WithCancellation(ct))
            if (f.Data is { Length: > 0 }) yield return f.Data.Value;
    }

    /* ===========================
     *     INFO / LIFECYCLE
     * =========================== */

    public Task EnsureContainerAsync(string container, CancellationToken ct = default)
        => _factory.ForContainer(container).EnsureContainerAsync(container, ct);

    public Task<StorageObjectInfo?> GetInfoAsync(string container, string key, CancellationToken ct = default)
        => _factory.ForContainer(container).GetInfoAsync(new StorageObjectId(container, key), ct);

    public Task<bool> DeleteAsync(string container, string key, CancellationToken ct = default)
        => _factory.ForContainer(container).DeleteAsync(new StorageObjectId(container, key), ct);

    /* ===========================
     *           HELPERS
     * =========================== */

    private static Dictionary<string, string>? Flatten(FileMetadata? m)
    {
        if (m is null) return null;

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // Human-readable
        Put(dict, "title", m.Title);
        Put(dict, "description", m.Description);
        Put(dict, "author", m.Author);
        Put(dict, "language", m.Language);
        if (m.Tags is { Count: > 0 })
            Put(dict, "tags", string.Join(",", m.Tags));

        // Technical
        Put(dict, "mime", m.MimeType);
        Put(dict, "sizeBytes", m.SizeBytes);
        Put(dict, "sha256", m.Sha256);

        // Content-specific
        Put(dict, "pageCount", m.PageCount);
        Put(dict, "durationSeconds", m.DurationSeconds);
        Put(dict, "widthPx", m.WidthPx);
        Put(dict, "heightPx", m.HeightPx);
        Put(dict, "frameRate", m.FrameRate);
        Put(dict, "bitrateKbps", m.BitrateKbps);
        Put(dict, "wordCount", m.WordCount);
        Put(dict, "lineCount", m.LineCount);

        // Lifecycle
        Put(dict, "expiresUtc", m.ExpiresUtc);

        // Storage flags
        Put(dict, "storageClass", m.StorageClass);
        Put(dict, "isEncrypted", m.IsEncrypted);
        Put(dict, "isCompressed", m.IsCompressed);

        // Flexible extra metadata
        if (m.Data is not null)
            Put(dict, "data", JsonSerializer.Serialize(m.Data));

        // Audit (emit only if set; avoid default(DateTime))
        if (m.CreatedAt != default) Put(dict, "createdAt", m.CreatedAt);
        if (!string.IsNullOrWhiteSpace(m.CreatedBy)) Put(dict, "createdBy", m.CreatedBy);
        if (m.UpdatedAt != default) Put(dict, "updatedAt", m.UpdatedAt);
        if (!string.IsNullOrWhiteSpace(m.UpdatedBy)) Put(dict, "updatedBy", m.UpdatedBy);

        return dict.Count == 0 ? null : dict;
    }

    private static void Put(Dictionary<string, string> d, string key, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value)) d[key] = value!;
    }
    private static void Put(Dictionary<string, string> d, string key, bool? value)
    {
        if (value.HasValue) d[key] = value.Value ? "true" : "false";
    }
    private static void Put(Dictionary<string, string> d, string key, int? value)
    {
        if (value.HasValue) d[key] = value.Value.ToString();
    }
    private static void Put(Dictionary<string, string> d, string key, long? value)
    {
        if (value.HasValue) d[key] = value.Value.ToString();
    }
    private static void Put(Dictionary<string, string> d, string key, DateTimeOffset? value)
    {
        if (value.HasValue) d[key] = value.Value.UtcDateTime.ToString("o");
    }
    private static void Put(Dictionary<string, string> d, string key, DateTime value)
    {
        if (value != default) d[key] = DateTime.SpecifyKind(value, DateTimeKind.Utc).ToString("o");
    }

    private static async IAsyncEnumerable<ReadOnlyMemory<byte>> StreamToChunks(
        Stream src, int chunkSize,
        [EnumeratorCancellation] CancellationToken ct)
    {
        if (chunkSize < 64 * 1024) chunkSize = 64 * 1024;
        if (chunkSize > 2 * 1024 * 1024) chunkSize = 2 * 1024 * 1024;

        var buffer = ArrayPool<byte>.Shared.Rent(chunkSize);
        try
        {
            int read;
            while ((read = await src.ReadAsync(buffer.AsMemory(0, chunkSize), ct)) > 0)
                yield return buffer.AsMemory(0, read);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }
}
