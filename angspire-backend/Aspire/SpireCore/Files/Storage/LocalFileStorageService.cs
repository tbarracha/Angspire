
using System.Security.Cryptography;
using System.Text.Json;

namespace SpireCore.Files.Storage;

public sealed class LocalFileStorageOptions
{
    /// Root folder where all containers live. Defaults to Windows-friendly path.
    public string RootPath { get; set; } = @"C:\data\files";
    /// Emit progress acks every N bytes while writing
    public int AckEveryBytes { get; set; } = 4 * 1024 * 1024; // 4MB
    /// Use .meta.json alongside file to persist ContentType & Metadata
    public bool UseSidecarMetadata { get; set; } = true;
}

internal sealed record LocalMeta(string ContentType, Dictionary<string, string>? Metadata, string? Sha256);

public sealed class LocalFileStorageService : FileStorageServiceBase
{
    public override string ProviderKey => "local";

    private readonly LocalFileStorageOptions _opts;

    public LocalFileStorageService(LocalFileStorageOptions opts) => _opts = opts;

    /* ---------- Container / metadata ---------- */

    public override Task<bool> ContainerExistsAsync(string container, CancellationToken ct = default)
        => Task.FromResult(Directory.Exists(ResolveContainerPath(container)));

    public override Task EnsureContainerAsync(string container, CancellationToken ct = default)
    {
        Directory.CreateDirectory(ResolveContainerPath(container));
        return Task.CompletedTask;
    }

    public override async Task<StorageObjectInfo?> GetInfoAsync(StorageObjectId id, CancellationToken ct = default)
    {
        var (filePath, metaPath) = ResolvePaths(id);
        if (!File.Exists(filePath)) return null;

        var fi = new FileInfo(filePath);
        LocalMeta? meta = await TryReadMeta(metaPath, ct);

        return new StorageObjectInfo(
            id,
            SizeBytes: fi.Length,
            ContentType: meta?.ContentType ?? "application/octet-stream",
            ETag: null,
            Sha256: meta?.Sha256,
            LastModifiedUtc: fi.LastWriteTimeUtc,
            Metadata: meta?.Metadata
        );
    }

    public override async IAsyncEnumerable<StorageObjectInfo> ListAsync(string container, string? prefix = null, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var root = ResolveContainerPath(container);
        if (!Directory.Exists(root)) yield break;

        var searchRoot = string.IsNullOrWhiteSpace(prefix) ? root : Path.Combine(root, SanitizeKey(prefix!));
        if (!Directory.Exists(searchRoot)) yield break;

        foreach (var path in Directory.EnumerateFiles(searchRoot, "*", SearchOption.AllDirectories))
        {
            if (path.EndsWith(".meta.json", StringComparison.OrdinalIgnoreCase)) continue;

            var rel = Path.GetRelativePath(root, path).Replace('\\', '/');
            var id = new StorageObjectId(container, rel);
            var fi = new FileInfo(path);
            var meta = await TryReadMeta(path + ".meta.json", ct);
            yield return new StorageObjectInfo(
                id,
                fi.Length,
                meta?.ContentType ?? "application/octet-stream",
                null,
                meta?.Sha256,
                fi.LastWriteTimeUtc,
                meta?.Metadata
            );
        }
    }

    public override Task<bool> DeleteAsync(StorageObjectId id, CancellationToken ct = default)
    {
        var (filePath, metaPath) = ResolvePaths(id);
        var existed = File.Exists(filePath);
        try { if (File.Exists(filePath)) File.Delete(filePath); } catch { }
        try { if (File.Exists(metaPath)) File.Delete(metaPath); } catch { }
        return Task.FromResult(existed);
    }

    public override async Task<int> DeleteManyAsync(string container, IEnumerable<string> keys, CancellationToken ct = default)
    {
        var count = 0;
        foreach (var key in keys)
        {
            if (await DeleteAsync(new StorageObjectId(container, key), ct)) count++;
        }
        return count;
    }

    /* ---------- Download ---------- */

    protected override Task<Stream> OpenReadCoreAsync(StorageObjectId id, CancellationToken ct)
    {
        var (filePath, _) = ResolvePaths(id);
        if (!File.Exists(filePath)) throw new FileNotFoundException($"Not found: {id}", filePath);
        Stream s = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 64, FileOptions.Asynchronous | FileOptions.SequentialScan);
        return Task.FromResult(s);
    }

    /* ---------- Upload (streamed) ---------- */

    public override async IAsyncEnumerable<StorageWriteAck> WriteAsync(
        StorageWriteDescriptor descriptor,
        IAsyncEnumerable<ReadOnlyMemory<byte>> chunks,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        await EnsureContainerAsync(descriptor.Target.Container, ct);

        var (filePath, metaPath) = ResolvePaths(descriptor.Target);
        var dir = Path.GetDirectoryName(filePath)!;
        Directory.CreateDirectory(dir);

        // temp file to ensure atomic finalize
        var tmp = Path.Combine(dir, $"._upload_{Guid.NewGuid():N}.tmp");
        long written = 0;
        var ackEvery = Math.Max(64 * 1024, _opts.AckEveryBytes);
        long nextAck = ackEvery;

        using var fs = new FileStream(tmp, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1024 * 64, FileOptions.Asynchronous | FileOptions.SequentialScan);
        using var sha = descriptor.ComputeSha256 ? IncrementalHash.CreateHash(HashAlgorithmName.SHA256) : null;

        // initial ack (negotiation)
        yield return new StorageWriteAck { BytesAccepted = 0, PartNumber = 0, Message = "start" };

        await foreach (var chunk in chunks.WithCancellation(ct))
        {
            if (chunk.Length == 0) continue;

            await fs.WriteAsync(chunk, ct);
            written += chunk.Length;
            sha?.AppendData(chunk.Span);

            if (written >= nextAck)
            {
                yield return new StorageWriteAck { BytesAccepted = written, Message = "progress" };
                nextAck = written + ackEvery;
            }
        }

        await fs.FlushAsync(ct);
        fs.Close();

        // finalize: move into place
        if (File.Exists(filePath)) File.Delete(filePath);
        File.Move(tmp, filePath);

        // write sidecar
        string? shaHex = sha != null ? Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant() : null;
        if (_opts.UseSidecarMetadata)
        {
            var localMeta = new LocalMeta(descriptor.ContentType, descriptor.Metadata?.ToDictionary(kv => kv.Key, kv => kv.Value), shaHex);
            await File.WriteAllTextAsync(metaPath, JsonSerializer.Serialize(localMeta), ct);
        }

        var info = await GetInfoAsync(descriptor.Target, ct) ?? new StorageObjectInfo(
            descriptor.Target,
            SizeBytes: new FileInfo(filePath).Length,
            ContentType: descriptor.ContentType,
            ETag: null,
            Sha256: shaHex,
            LastModifiedUtc: DateTimeOffset.UtcNow,
            Metadata: descriptor.Metadata
        );

        yield return new StorageWriteAck { BytesAccepted = written, IsCompleted = true, FinalInfo = info, Message = "completed" };
    }

    /* ---------- helpers ---------- */

    private string ResolveContainerPath(string container)
    {
        var c = SanitizeSegment(container);
        var path = Path.GetFullPath(Path.Combine(_opts.RootPath, c));
        EnsureUnderRoot(path);
        return path;
    }

    private (string filePath, string metaPath) ResolvePaths(StorageObjectId id)
    {
        var root = ResolveContainerPath(id.Container);
        var key = SanitizeKey(id.Key);
        var filePath = Path.GetFullPath(Path.Combine(root, key));
        EnsureUnderRoot(filePath);
        var metaPath = filePath + ".meta.json";
        return (filePath, metaPath);
    }

    private static string SanitizeSegment(string s)
        => string.Join('_', s.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Trim();

    private static string SanitizeKey(string key)
    {
        key = key.Replace('\\', '/');
        // strip .. and leading slashes
        var parts = key.Split('/', StringSplitOptions.RemoveEmptyEntries)
                       .Select(SanitizeSegment);
        return Path.Combine(parts.ToArray());
    }

    private void EnsureUnderRoot(string fullPath)
    {
        var root = Path.GetFullPath(_opts.RootPath);
        if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Path traversal detected.");
    }

    private static async Task<LocalMeta?> TryReadMeta(string metaPath, CancellationToken ct)
    {
        if (!File.Exists(metaPath)) return null;
        try
        {
            await using var fs = new FileStream(metaPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return await JsonSerializer.DeserializeAsync<LocalMeta>(fs, cancellationToken: ct);
        }
        catch { return null; }
    }
}