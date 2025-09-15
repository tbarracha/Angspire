using Microsoft.EntityFrameworkCore;

namespace SpireCore.API.DbProviders.EntityFramework.DbContexts;

public abstract class BaseEntityDbContext : BaseDbContext
{
    protected BaseEntityDbContext(DbContextOptions options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
        modelBuilder.ApplyIEntityConfiguration();
    }
}

