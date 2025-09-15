using SpireCore.Abstractions.Interfaces;

namespace SpireCore.Files;

/// <summary>
/// Generic file metadata DTO – all fields are optional except audit fields required by interfaces.
/// Use <see cref="Data"/> for domain-specific extensions.
/// </summary>
public sealed class FileMetadata : ICreatedAt, ICreatedBy, IUpdatedAt, IUpdatedBy
{
    // ==========================
    // Human-readable
    // ==========================
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Author { get; init; }
    public IList<string>? Tags { get; init; }
    public string? Language { get; init; }

    // ==========================
    // Technical
    // ==========================
    public string? MimeType { get; init; }
    public long? SizeBytes { get; init; }
    public string? Sha256 { get; init; } // Single canonical checksum to avoid duplication

    // ==========================
    // Content-specific
    // ==========================
    public int? PageCount { get; init; }        // documents
    public int? DurationSeconds { get; init; }  // audio/video
    public int? WidthPx { get; init; }          // images/video
    public int? HeightPx { get; init; }
    public int? FrameRate { get; init; }        // video
    public int? BitrateKbps { get; init; }      // audio/video
    public int? WordCount { get; init; }        // text
    public int? LineCount { get; init; }        // code/text

    // ==========================
    // Lifecycle
    // ==========================
    public DateTimeOffset? ExpiresUtc { get; init; } // keep only explicit retention; audit timestamps come from interfaces

    // ==========================
    // Storage
    // ==========================
    public string? StorageClass { get; init; }  // e.g., Standard, Archive
    public bool? IsEncrypted { get; init; }
    public bool? IsCompressed { get; init; }

    // ==========================
    // Flexible extra metadata
    // ==========================
    public object? Data { get; init; }

    // ==========================
    // Audit (from interfaces)
    // ==========================
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}
