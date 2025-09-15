namespace SpireCore.API.Contracts.Entities.Dtos;

/// <summary>
/// DTO counterpart of IEntity&lt;TId&gt; (Id, CreatedAt, UpdatedAt, State).
/// Keep this storage-agnostic; do not implement domain interfaces here.
/// </summary>
public abstract class EntityDto<TId> : IEntity<TId>
{
    public TId Id { get; set; } = default!;
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// May be default(DateTime) if never updated; nullable is also acceptable—
    /// choose one convention and be consistent across your API.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Mirrors IStateFlag (e.g., Active/Inactive/Deleted).
    /// </summary>
    public string StateFlag { get; set; }
}

/// <summary>
/// Convenience aliases for Guid-based entities (most Mongo-backed models).
/// </summary>
public abstract class EntityDto : EntityDto<Guid> { }
