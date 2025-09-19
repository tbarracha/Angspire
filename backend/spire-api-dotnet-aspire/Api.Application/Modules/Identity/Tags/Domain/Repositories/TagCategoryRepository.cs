using Genspire.Application.Modules.Identity.Tags.Domain.Models;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Identity.Tags.Domain.Repositories;
public class TagCategoryRepository : MongoEntityRepository<TagCategory>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "TagCategories";
    public TagCategoryRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }

    /// <summary>
    /// Finds a Tag by display name (case-insensitive).
    /// </summary>
    public async Task<TagCategory?> FindByNameAsync(string name)
    {
        return await FindAsync(t => t.Name.ToLower() == name.ToLower());
    }
}