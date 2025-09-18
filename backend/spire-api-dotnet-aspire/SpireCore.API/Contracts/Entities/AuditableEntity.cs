using System.ComponentModel;

namespace SpireCore.API.Contracts.Entities;

public abstract class AuditableEntity<TId> : Entity<TId>, IAuditableEntity<TId>
{
    [DefaultValue(null)]
    public string? CreatedBy { get; set; }

    [DefaultValue(null)]
    public string? UpdatedBy { get; set; }
}
