using Genspire.Application.Modules.Identity.Tags.Domain.Models;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Identity.Tags.Domain.Repositories;
public class TagRepository : MongoEntityRepository<Tag>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "Tags";
    public TagRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }

    /// <summary>
    /// Finds a Tag by display name (case-insensitive).
    /// </summary>
    public async Task<Tag?> FindByNameAsync(string name)
    {
        return await FindAsync(t => t.DisplayName.ToLower() == name.ToLower());
    }
}