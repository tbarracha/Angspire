namespace Shared.Database;

public sealed class DbSettings
{
    public string Profile { get; set; } = "dev";
    public Dictionary<string, DbProfileSettings> Profiles { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class DbProfileSettings
{
    // Relational (EF Core) → Sqlite / PostgreSQL / SqlServer (future)
    public SqlEndpoint Auth { get; set; } = new();

    // NoSQL / embedded → MongoDb / LiteDb
    public NoSqlEndpoint Domain { get; set; } = new();

    // Vectors → Sqlite (sqlite-vec) / PostgreSQL (pgvector) / ChromaDb (HTTP)
    public VectorEndpoint Vectors { get; set; } = new();

    // File storage → Local / S3 (MinIO) / AzureBlob (future)
    public FileStorageEndpoint FileStorage { get; set; } = new();
}

/// Base endpoint
public abstract class BaseEndpoint
{
    public DbProvider Provider { get; set; }
    public string? ConnectionString { get; set; }
}

/// Relational SQL endpoint (EF-backed)
public class SqlEndpoint : BaseEndpoint { }

/// NoSQL endpoint (document / embedded stores)
public sealed class NoSqlEndpoint : BaseEndpoint
{
    /// <summary>Logical database name (MongoDb) or file-scoped DB name (LiteDb).</summary>
    public string? Database { get; set; }

    /// <summary>Optional default collection/table name for convenience.</summary>
    public string? Collection { get; set; }
}

/// Vector endpoint supports SQL & HTTP (Chroma)
public sealed class VectorEndpoint : SqlEndpoint
{
    public SqliteVectorOptions? Sqlite { get; set; }
    public PgVectorOptions? PgVector { get; set; }
    public ChromaOptions? Chroma { get; set; }
}

public sealed class SqliteVectorOptions
{
    public string? VectorExtension { get; set; }   // e.g., "sqlite-vec" or "sqlite-vss"
    public int? VectorDimension { get; set; }
}

public sealed class PgVectorOptions
{
    public bool UsePgVector { get; set; } = true;
    public string Schema { get; set; } = "public";
    public string Table { get; set; } = "embeddings";
    public string VectorColumn { get; set; } = "embedding";
    public int? VectorDimension { get; set; }
}

public sealed class ChromaOptions
{
    /// <summary>Optional explicit API base (e.g., http://genspire-vectors:8000/api/v1). If null, derive from ConnectionString.</summary>
    public string? ApiBase { get; set; }
}

public sealed class QdrantOptions
{
    public string? HttpUrl { get; set; } // e.g., http://localhost:6333
    public string? GrpcUrl { get; set; } // e.g., http://localhost:6334
    public string? ApiKey { get; set; }
}

public enum DbProvider
{
    // Relational
    Sqlite,
    PostgreSQL,

    // NoSQL / embedded
    MongoDb,
    LiteDb,

    // HTTP vector DBs
    ChromaDb,
    Qdrant // NEW
}

public sealed class FileStorageEndpoint
{
    public string Provider { get; set; } = "Local"; // Local, S3, AzureBlob, etc.

    // Local
    public string? RootPath { get; set; }

    // Flattened S3/MinIO fields
    public string? Bucket { get; set; }
    public string? Region { get; set; }
    public string? BaseUrl { get; set; }
    public string? ServiceUrl { get; set; }
    public string? AccessKey { get; set; }
    public string? SecretKey { get; set; }
    public bool? ForcePathStyle { get; set; }

    // Optional nested block (dev profile in your JSON)
    public S3Options? S3 { get; set; }

    public void NormalizeS3()
    {
        if (S3 is null) return;

        // Only fill missing flattened values from nested S3
        Bucket ??= S3.Bucket;
        Region ??= S3.Region;
        BaseUrl ??= S3.BaseUrl;
        ServiceUrl ??= S3.ServiceUrl;
        AccessKey ??= S3.AccessKey;
        SecretKey ??= S3.SecretKey;
        ForcePathStyle ??= S3.ForcePathStyle;
    }
}

public sealed class S3Options
{
    public string? Bucket { get; set; }
    public string? Region { get; set; }
    public string? BaseUrl { get; set; }
    public string? ServiceUrl { get; set; }
    public string? AccessKey { get; set; }
    public string? SecretKey { get; set; }
    public bool? ForcePathStyle { get; set; }
}