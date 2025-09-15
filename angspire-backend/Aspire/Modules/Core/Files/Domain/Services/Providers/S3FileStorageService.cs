using Amazon.S3;
using Amazon.S3.Model;
using SpireCore.Files.Storage;
using System.Buffers;
using System.Security.Cryptography;

namespace App.Core.Files.Domain.Services.Providers;

public sealed class S3FileStorageOptions
{
    public string Bucket { get; set; } = "genspire-files";
    public string? BaseUrl { get; set; } // optional public base (e.g., http://localhost:9000/genspire-files)
    public int AckEveryBytes { get; set; } = 8 * 1024 * 1024; // 8MB
    // Multipart part size suggestion (S3 requires >= 5MB)
    public int PartSizeBytes { get; set; } = 8 * 1024 * 1024;
}

public sealed class S3FileStorageService : FileStorageServiceBase
{
    public override string ProviderKey => "s3";

    private readonly IAmazonS3 _s3;
    private readonly S3FileStorageOptions _opts;

    public S3FileStorageService(IAmazonS3 s3, S3FileStorageOptions opts)
    {
        _s3 = s3; _opts = opts;
    }

    /* ---------- Container / metadata ---------- */

    public override async Task<bool> ContainerExistsAsync(string container, CancellationToken ct = default)
    {
        var list = await _s3.ListBucketsAsync(ct);
        return list.Buckets.Any(b => string.Equals(b.BucketName, container, StringComparison.Ordinal));
    }

    public override async Task EnsureContainerAsync(string container, CancellationToken ct = default)
    {
        if (await ContainerExistsAsync(container, ct)) return;
        await _s3.PutBucketAsync(new PutBucketRequest { BucketName = container }, ct);
    }

    public override async Task<StorageObjectInfo?> GetInfoAsync(StorageObjectId id, CancellationToken ct = default)
    {
        try
        {
            var meta = await _s3.GetObjectMetadataAsync(id.Container, id.Key, ct);

            // meta.LastModified may be null depending on SDK flavor; convert safely to DateTimeOffset?
            DateTimeOffset? lastModified = meta.LastModified.HasValue
                ? new DateTimeOffset(meta.LastModified.Value.ToUniversalTime())
                : (DateTimeOffset?)null;

            // S3 metadata collection to dictionary (may be empty)
            var dict = meta.Metadata?.Keys?.ToDictionary(k => k, k => meta.Metadata[k]);

            return new StorageObjectInfo(
                id,
                meta.ContentLength,
                string.IsNullOrWhiteSpace(meta.Headers.ContentType) ? "application/octet-stream" : meta.Headers.ContentType,
                meta.ETag?.Trim('"'),
                Sha256: null, // compute separately if needed
                LastModifiedUtc: lastModified,
                Metadata: dict
            );
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public override async IAsyncEnumerable<StorageObjectInfo> ListAsync(
        string container,
        string? prefix = null,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        string? token = null;
        do
        {
            var req = new ListObjectsV2Request
            {
                BucketName = container,
                Prefix = prefix ?? "",
                ContinuationToken = token
            };
            var resp = await _s3.ListObjectsV2Async(req, ct);

            foreach (var o in resp.S3Objects)
            {
                // o.LastModified is DateTime? in some SDKs; convert safely
                DateTimeOffset? lastMod = o.LastModified.HasValue
                    ? new DateTimeOffset(o.LastModified.Value).ToUniversalTime()
                    : (DateTimeOffset?)null;

                yield return new StorageObjectInfo(
                    new StorageObjectId(container, o.Key),
                    o.Size,
                    "application/octet-stream", // unknown without HEAD; fine for listings
                    ETag: null,
                    Sha256: null,
                    LastModifiedUtc: lastMod,
                    Metadata: null
                );
            }

            // Guard nullable IsTruncated variants
            token = (resp.IsTruncated == true) ? resp.NextContinuationToken : null;
        } while (token != null);
    }

    public override async Task<bool> DeleteAsync(StorageObjectId id, CancellationToken ct = default)
    {
        await _s3.DeleteObjectAsync(id.Container, id.Key, ct);
        return true;
    }

    public override async Task<int> DeleteManyAsync(string container, IEnumerable<string> keys, CancellationToken ct = default)
    {
        var list = keys.ToList();
        if (list.Count == 0) return 0;

        var req = new DeleteObjectsRequest { BucketName = container };
        req.Objects.AddRange(list.Select(k => new KeyVersion { Key = k }));
        var resp = await _s3.DeleteObjectsAsync(req, ct);
        return resp.DeletedObjects.Count;
    }

    /* ---------- Download ---------- */

    protected override async Task<Stream> OpenReadCoreAsync(StorageObjectId id, CancellationToken ct)
    {
        var o = await _s3.GetObjectAsync(id.Container, id.Key, ct);
        // Caller will dispose stream
        return o.ResponseStream;
    }

    /* ---------- Upload (streamed -> multipart) ---------- */

    public override async IAsyncEnumerable<StorageWriteAck> WriteAsync(
    StorageWriteDescriptor descriptor,
    IAsyncEnumerable<ReadOnlyMemory<byte>> chunks,
    [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        // Ensure bucket
        await EnsureContainerAsync(descriptor.Target.Container, ct);

        // Init multipart
        var init = await _s3.InitiateMultipartUploadAsync(new InitiateMultipartUploadRequest
        {
            BucketName = descriptor.Target.Container,
            Key = descriptor.Target.Key,
            ContentType = descriptor.ContentType
        }, ct);

        var partTags = new List<PartETag>();
        long written = 0;
        int partNo = 1;
        var partSize = Math.Max(5 * 1024 * 1024, descriptor.PreferredChunkSizeBytes ?? _opts.PartSizeBytes);
        var ackEvery = Math.Max(1 * 1024 * 1024, _opts.AckEveryBytes);
        long nextAck = ackEvery;

        using var sha = descriptor.ComputeSha256 ? IncrementalHash.CreateHash(HashAlgorithmName.SHA256) : null;

        // Buffer at least one full part before each UploadPart
        byte[] buffer = ArrayPool<byte>.Shared.Rent(partSize);
        int buffered = 0;

        // initial ack (before try/finally to avoid yield-inside-catch restriction)
        yield return new StorageWriteAck { BytesAccepted = 0, PartNumber = 0, Message = "start" };

        bool completed = false; // decide abort vs complete in finally

        try
        {
            await foreach (var incoming in chunks.WithCancellation(ct))
            {
                // Work with ReadOnlyMemory; only materialize Span at the copy site
                int idx = 0;
                int remaining = incoming.Length;

                while (remaining > 0)
                {
                    int toCopy = Math.Min(partSize - buffered, remaining);

                    // Span only exists for this statement; no await between creation and use
                    incoming.Span.Slice(idx, toCopy).CopyTo(buffer.AsSpan(buffered));

                    buffered += toCopy;
                    idx += toCopy;
                    remaining -= toCopy;

                    if (buffered == partSize)
                    {
                        using var ms = new MemoryStream(buffer, 0, buffered, writable: false);
                        var up = await _s3.UploadPartAsync(new UploadPartRequest
                        {
                            BucketName = descriptor.Target.Container,
                            Key = descriptor.Target.Key,
                            UploadId = init.UploadId,
                            PartNumber = partNo,
                            PartSize = buffered,
                            InputStream = ms
                        }, ct);

                        partTags.Add(new PartETag(partNo, up.ETag));
                        sha?.AppendData(buffer, 0, buffered);
                        written += buffered;
                        buffered = 0;
                        partNo++;

                        if (written >= nextAck)
                        {
                            yield return new StorageWriteAck { BytesAccepted = written, PartNumber = partNo - 1, Message = "progress" };
                            nextAck = written + ackEvery;
                        }
                    }
                }
            }

            // flush remaining (< partSize)
            if (buffered > 0)
            {
                using var ms = new MemoryStream(buffer, 0, buffered, writable: false);
                var up = await _s3.UploadPartAsync(new UploadPartRequest
                {
                    BucketName = descriptor.Target.Container,
                    Key = descriptor.Target.Key,
                    UploadId = init.UploadId,
                    PartNumber = partNo,
                    PartSize = buffered,
                    InputStream = ms
                }, ct);

                partTags.Add(new PartETag(partNo, up.ETag));
                sha?.AppendData(buffer, 0, buffered);
                written += buffered;
                buffered = 0;
                partNo++;
            }

            // complete multipart
            await _s3.CompleteMultipartUploadAsync(new CompleteMultipartUploadRequest
            {
                BucketName = descriptor.Target.Container,
                Key = descriptor.Target.Key,
                UploadId = init.UploadId,
                PartETags = partTags
            }, ct);

            completed = true;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);

            if (!completed)
            {
                // best-effort abort if anything failed or the iterator was disposed early
                try
                {
                    await _s3.AbortMultipartUploadAsync(new AbortMultipartUploadRequest
                    {
                        BucketName = descriptor.Target.Container,
                        Key = descriptor.Target.Key,
                        UploadId = init.UploadId
                    }, ct);
                }
                catch { /* swallow */ }
            }
        }

        // HEAD for final metadata
        var info = await GetInfoAsync(descriptor.Target, ct);
        var shaHex = sha != null ? Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant() : null;

        info ??= new StorageObjectInfo(
            descriptor.Target,
            SizeBytes: written,
            ContentType: descriptor.ContentType,
            ETag: partTags.LastOrDefault()?.ETag?.Trim('"'),
            Sha256: shaHex,
            LastModifiedUtc: DateTimeOffset.UtcNow,
            Metadata: null
        );

        // final ack
        yield return new StorageWriteAck
        {
            BytesAccepted = written,
            IsCompleted = true,
            FinalInfo = info with { Sha256 = info.Sha256 ?? shaHex },
            Message = "completed"
        };
    }
}
