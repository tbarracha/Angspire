using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.GenAI.Providers.Domain.Repositories;
public class ProviderConfigRepository : MongoAuditableEntityRepository<Provider>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "ProviderConfigs";
    public ProviderConfigRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}