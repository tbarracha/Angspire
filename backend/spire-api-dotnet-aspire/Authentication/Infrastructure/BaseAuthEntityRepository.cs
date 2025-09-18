using SpireCore.API.DbProviders.EntityFramework.Repositories;

namespace Authentication.Infrastructure;

public abstract class BaseAuthEntityRepository<T> : EfAuditableEntityRepository<T, Guid, AuthDbContext> where T : BaseAuthEntity
{
    protected BaseAuthEntityRepository(AuthDbContext context) : base(context)
    {
    }
}