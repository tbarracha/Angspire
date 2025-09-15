using App.Core.Identity.Tags.Models;
using App.Core.Repositories;
using SpireCore.API.Configuration.Modules;

namespace App.Core.Identity.Tags.Repositories;

public class TagRepository : DomainMongoRepository<Tag>
{
    private const string Collection = "Tags";

    public TagRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }

    /// <summary>
    /// Finds a Tag by display name (case-insensitive).
    /// </summary>
    public async Task<Tag?> FindByNameAsync(string name)
    {
        return await FindAsync(t => t.DisplayName.ToLower() == name.ToLower());
    }
}