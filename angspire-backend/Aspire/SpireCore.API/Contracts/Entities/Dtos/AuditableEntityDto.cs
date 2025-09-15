using System.Text.Json.Serialization;

namespace SpireCore.API.Contracts.Entities.Dtos;

/// <summary>
/// DTO counterpart of IAuditableEntity&lt;TId&gt; (adds CreatedBy/UpdatedBy).
/// </summary>
public abstract class AuditableEntityDto<TId> : EntityDto<TId>, IAuditableEntity<TId>
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CreatedBy { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? UpdatedBy { get; set; }
}

public abstract class AuditableDto : AuditableEntityDto<Guid> { }