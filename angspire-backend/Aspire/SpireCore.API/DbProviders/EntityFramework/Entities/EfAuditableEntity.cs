using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpireCore.Abstractions.Interfaces;
using SpireCore.API.Contracts.Entities;
using SpireCore.API.DbProviders.EntityFramework.Entities;
using System.ComponentModel;

public abstract class EfAuditableEntity<TId> : EfEntity<TId>, IAuditableEntity<TId>
{
    [DefaultValue(null)]
    public string? CreatedBy { get; set; }
    [DefaultValue(null)]
    public string? UpdatedBy { get; set; }

    public override void ConfigureEntity<T>(EntityTypeBuilder<T> builder)
    {
        base.ConfigureEntity(builder);

        if (typeof(ICreatedBy).IsAssignableFrom(typeof(T)))
        {
            BaseEfEntityConfigurationHelper.ConfigureCreatedBy((EntityTypeBuilder<ICreatedBy>)(object)builder);
        }
        if (typeof(IUpdatedBy).IsAssignableFrom(typeof(T)))
        {
            BaseEfEntityConfigurationHelper.ConfigureUpdatedBy((EntityTypeBuilder<IUpdatedBy>)(object)builder);
        }
    }
}

