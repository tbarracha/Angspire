using SpireCore.API.DbProviders.EntityFramework.Repositories;

namespace Genspire.Application.Modules.Authentication.Infrastructure;
public abstract class BaseAuthEntityRepository<T> : EfAuditableEntityRepository<T, Guid, BaseAuthDbContext> where T : BaseAuthEntity
{
    protected BaseAuthEntityRepository(BaseAuthDbContext context) : base(context)
    {
    }
}