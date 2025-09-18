// File: App.Core.Files/Operations/Upload/FileUploadWithMetadataOperation.cs
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.StaticFiles;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Files;

namespace App.Core.Files.Operations.Upload;

public sealed class FileMetadata
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? MimeType { get; init; }
    public object? Data { get; init; }
}

public sealed class FileUploadWithMetadataRequest
{
    // allow one or many (both supported by binder)
    public IReadOnlyList<IBinaryPart>? Files { get; init; }
    public IBinaryPart? File { get; init; }

    public FileMetadata? Metadata { get; init; }
    public IReadOnlyList<FileMetadata?>? Metadatas { get; init; }
    public string TargetSubfolder { get; init; } = Path.Combine("Resources", "Images");
    public string? FileNameOverride { get; init; } // applied when single-file
}

public sealed record FileUploadItemResult(string DbPath, string OriginalName, FileMetadata? Metadata);
public sealed record FileUploadWithMetadataResponse(
    string? DbPath,                    // filled for single-file uploads
    FileMetadata? Metadata,
    IReadOnlyList<FileUploadItemResult>? Items // filled for multi-file
);

[OperationGroup("Files")]
[OperationRoute("files/upload/with-metadata")]
[OperationMethod("POST")]
public sealed class FileUploadWithMetadataOperation
    : OperationBase<FileUploadWithMetadataRequest, FileUploadWithMetadataResponse>,
      IFileUploadOperation<FileUploadWithMetadataRequest, FileUploadWithMetadataResponse>
{
    private readonly IWebHostEnvironment _env;
    public FileUploadWithMetadataOperation(IWebHostEnvironment env) => _env = env;

    protected override async Task<FileUploadWithMetadataResponse> HandleAsync(FileUploadWithMetadataRequest req)
    {
        var target = Path.Combine(_env.ContentRootPath, req.TargetSubfolder);
        Directory.CreateDirectory(target);

        // Prefer Files; fallback to single File
        var files = (req.Files is { Count: > 0 })
            ? req.Files
            : (req.File is not null ? new[] { req.File } : Array.Empty<IBinaryPart>());

        if (files.Count == 0)
            throw new InvalidOperationException("No files provided.");

        // Single-file legacy path (honors FileNameOverride)
        if (files.Count == 1)
        {
            var f = files[0];
            var name = string.IsNullOrWhiteSpace(req.FileNameOverride) ? f.FileName : req.FileNameOverride!;
            var (dbPath, meta) = await SaveOneAsync(target, req.TargetSubfolder, f, name, req.Metadata);
            return new(dbPath, meta, null);
        }

        // Multi-file path
        var results = new List<FileUploadItemResult>(files.Count);
        for (var i = 0; i < files.Count; i++)
        {
            var f = files[i];
            var meta = req.Metadatas is { Count: > 0 } && i < req.Metadatas.Count ? req.Metadatas[i] : req.Metadata;
            var (dbPath, _) = await SaveOneAsync(target, req.TargetSubfolder, f, f.FileName, meta);
            results.Add(new FileUploadItemResult(dbPath, f.FileName, meta));
        }
        return new(null, null, results);
    }

    private static async Task<(string DbPath, FileMetadata? Meta)> SaveOneAsync(
        string targetRoot, string relRoot, IBinaryPart file, string name, FileMetadata? meta)
    {
        name = name.Trim().Replace(' ', '_');

        var fullPath = Path.Combine(targetRoot, name);
        // Use tuned FileStream options
        await using var dst = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan);
        await using var src = file.OpenReadStream();
        await src.CopyToAsync(dst);

        var dbPath = Path.Combine(relRoot, name).Replace("\\", "/");
        return (dbPath, meta);
    }
}

public sealed class GetFileRequest
{
    public required string Container { get; init; } // e.g., "Resources/Images"
    public required string Key { get; init; }       // e.g., "logo.png" or "sub/file.png"
    public bool Inline { get; init; } = false;
}

[OperationGroup("Files")]
[OperationRoute("files/download")]
[OperationMethod("GET")]
public sealed class GetFileOperation
    : OperationBase<GetFileRequest, FileDownloadResult>,
      IFileDownloadOperation<GetFileRequest>
{
    private readonly IWebHostEnvironment _env;
    private static readonly FileExtensionContentTypeProvider _types = new();

    public GetFileOperation(IWebHostEnvironment env) => _env = env;

    protected override Task<FileDownloadResult> HandleAsync(GetFileRequest req)
    {
        // Basic validation
        if (string.IsNullOrWhiteSpace(req.Container) || string.IsNullOrWhiteSpace(req.Key))
            return Task.FromResult(FileDownloadResult.BadRequest("Container and Key are required."));

        // Disallow path traversal / rooted keys
        if (req.Key.Contains("..", StringComparison.Ordinal) || Path.IsPathRooted(req.Key))
            return Task.FromResult(FileDownloadResult.BadRequest("Invalid key."));

        // Resolve base and full path safely
        var baseDir = Path.GetFullPath(Path.Combine(_env.ContentRootPath, req.Container));
        var fullPath = Path.GetFullPath(Path.Combine(baseDir, req.Key));

        // Ensure the resolved path stays under baseDir
        if (!fullPath.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(FileDownloadResult.BadRequest("Invalid path."));

        // 404 if missing
        if (!File.Exists(fullPath))
        {
            var rel = $"{req.Container.TrimEnd('/')}/{req.Key}".Replace("\\", "/");
            return Task.FromResult(FileDownloadResult.NotFound($"File not found: {rel}"));
        }

        // Open stream with safe options
        var stream = new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 64 * 1024,
            options: FileOptions.Asynchronous | FileOptions.SequentialScan);

        // Content type by extension (fallback application/octet-stream)
        if (!_types.TryGetContentType(fullPath, out var contentType))
            contentType = "application/octet-stream";

        var lastMod = File.GetLastWriteTimeUtc(fullPath);

        return Task.FromResult(new FileDownloadResult
        {
            Content = stream,
            ContentType = contentType,
            FileName = Path.GetFileName(fullPath),
            AsAttachment = !req.Inline,
            LastModified = lastMod
        });
    }
}