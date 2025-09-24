using SpireCore.API.Configuration.Modules;
using SpireCore.API.Contracts.Entities;
using SpireCore.API.DbProviders.Mongo.Entities;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Shared.Repositories;

public abstract class DomainMongoRepository<T> : MongoEntityRepository<T>, ITransientService
    where T : MongoEntity, IEntity<Guid>
{
    private const string ModuleName = "angspire_domain";

    public DomainMongoRepository(IModuleDatabaseProvider provider, string collectionName) : base(provider, ModuleName, collectionName)
    {

    }
}
