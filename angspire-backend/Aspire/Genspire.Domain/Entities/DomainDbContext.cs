using Microsoft.EntityFrameworkCore;
using SpireCore.API.DbProviders.EntityFramework.DbContexts;

namespace Genspire.Domain.Entities;

public abstract class DomainDbContext : BaseEntityDbContext
{
    protected DomainDbContext(DbContextOptions options) : base(options)
    {
    }
}
