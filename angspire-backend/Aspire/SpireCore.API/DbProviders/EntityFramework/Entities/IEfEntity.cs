using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpireCore.API.Contracts.Entities;

namespace SpireCore.API.DbProviders.EntityFramework.Entities;

public interface IEfEntity<TId> : IEntity<TId>
{
    public void ConfigureEntity<T>(EntityTypeBuilder<T> builder) where T : class, IEfEntity<TId>;
}

