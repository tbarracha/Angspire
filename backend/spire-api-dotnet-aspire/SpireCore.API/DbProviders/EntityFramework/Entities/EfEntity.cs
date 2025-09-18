using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpireCore.API.Contracts.Entities;

namespace SpireCore.API.DbProviders.EntityFramework.Entities;

public abstract class EfEntity<TId> : Entity<TId>, IEfEntity<TId>
{
    // Generic virtual configuration for base fields
    public virtual void ConfigureEntity<T>(EntityTypeBuilder<T> builder) where T : class, IEfEntity<TId>
    {
        BaseEfEntityConfigurationHelper.ConfigureEntity<T, TId>(builder);
    }

}

