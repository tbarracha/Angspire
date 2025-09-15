using App.Core.Identity.Tags.Models;
using App.Core.Repositories;
using SpireCore.API.Configuration.Modules;

namespace App.Core.Identity.Tags.Repositories;

public class TagCategoryRepository : DomainMongoRepository<TagCategory>
{
    private const string Collection = "TagCategories";

    public TagCategoryRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }

    /// <summary>
    /// Finds a TagCategory by name (case-insensitive).
    /// </summary>
    public async Task<TagCategory?> FindByNameAsync(string name)
    {
        return await FindAsync(t => t.Name.ToLower() == name.ToLower());
    }
}
