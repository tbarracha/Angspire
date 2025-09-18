// File: SpireCore.Files.Storage/FileUploadSessionStore.cs
using System.Buffers;
using System.Runtime.CompilerServices;
using System.Text.Json;
using SpireCore.Services;

namespace SpireCore.Files.Storage;

/// <summary>
/// Stages chunks into a temp .part file; on completion you stream to the real provider.
/// </summary>
public sealed class FileUploadSessionStore : IUploadSessionStore, ISingletonService
{
    private readonly string _root;

    public FileUploadSessionStore(string? root = null)
    {
        _root = root ?? Path.Combine(Path.GetTempPath(), "spirecore-upload-sessions");
        Directory.CreateDirectory(_root);
    }

    public async Task<string> CreateAsync(UploadSessionInit init, CancellationToken ct)
    {
        var id = Convert.ToHexString(Guid.NewGuid().ToByteArray()).ToLowerInvariant();
        var dir = Path.Combine(_root, id);
        Directory.CreateDirectory(dir);

        await File.WriteAllTextAsync(Path.Combine(dir, "meta.json"),
            JsonSerializer.Serialize(new Meta
            {
                UploadId = id,
                FileName = init.FileName,
                ContentType = init.ContentType,
                TargetContainer = init.TargetContainer,
                TotalLength = init.TotalLength
            }), ct);

        using var _ = File.Open(Path.Combine(dir, "data.part"), FileMode.CreateNew, FileAccess.Write, FileShare.Read);
        return id;
    }

    public Task<bool> ExistsAsync(string uploadId, CancellationToken ct)
        => Task.FromResult(Directory.Exists(Path.Combine(_root, uploadId)));

    public async Task<long> AppendAsync(string uploadId, long offset, Stream src, CancellationToken ct)
    {
        var (part, _) = await PathsAsync(uploadId);
        using var fs = new FileStream(part, FileMode.Open, FileAccess.Write, FileShare.Read);
        if (fs.Length != offset)
            throw new InvalidOperationException($"Offset mismatch. Server={fs.Length}, Client={offset}");

        fs.Seek(offset, SeekOrigin.Begin);
        await src.CopyToAsync(fs, 1024 * 1024, ct); // 1MB internal buffer
        return fs.Length;
    }

    public async Task<(long BytesReceived, long? Total)> GetProgressAsync(string uploadId, CancellationToken ct)
    {
        var (part, metaPath) = await PathsAsync(uploadId);
        var len = new FileInfo(part).Length;
        var m = await ReadMetaAsync(metaPath, ct);
        return (len, m.TotalLength);
    }

    public async Task<UploadSessionInfo> GetInfoAsync(string uploadId, CancellationToken ct)
    {
        var (part, metaPath) = await PathsAsync(uploadId);
        var m = await ReadMetaAsync(metaPath, ct);
        return new UploadSessionInfo(uploadId, m.FileName, m.ContentType, m.TargetContainer, m.TotalLength, part);
    }

    public async IAsyncEnumerable<ReadOnlyMemory<byte>> ReadAsChunks(
        string uploadId, int chunkSize, [EnumeratorCancellation] CancellationToken ct)
    {
        var (part, _) = await PathsAsync(uploadId);
        if (chunkSize < 64 * 1024) chunkSize = 64 * 1024;
        if (chunkSize > 2 * 1024 * 1024) chunkSize = 2 * 1024 * 1024;

        var buffer = ArrayPool<byte>.Shared.Rent(chunkSize);
        try
        {
            using var fs = new FileStream(part, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 64, FileOptions.Asynchronous | FileOptions.SequentialScan);
            int read;
            while ((read = await fs.ReadAsync(buffer.AsMemory(0, chunkSize), ct)) > 0)
                yield return buffer.AsMemory(0, read);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    public Task DeleteAsync(string uploadId, CancellationToken ct)
    {
        var dir = Path.Combine(_root, uploadId);
        if (Directory.Exists(dir))
        {
            try { Directory.Delete(dir, true); } catch { /* best effort */ }
        }
        return Task.CompletedTask;
    }

    // ---- helpers ----
    private Task<(string partPath, string metaPath)> PathsAsync(string uploadId)
    {
        var dir = Path.Combine(_root, uploadId);
        if (!Directory.Exists(dir)) throw new FileNotFoundException("Upload session not found", dir);
        return Task.FromResult((Path.Combine(dir, "data.part"), Path.Combine(dir, "meta.json")));
    }

    private static async Task<Meta> ReadMetaAsync(string path, CancellationToken ct)
        => JsonSerializer.Deserialize<Meta>(await File.ReadAllTextAsync(path, ct))!;

    private sealed class Meta
    {
        public string UploadId { get; init; } = default!;
        public string FileName { get; init; } = default!;
        public string ContentType { get; init; } = default!;
        public string TargetContainer { get; init; } = default!;
        public long? TotalLength { get; init; }
    }
}
