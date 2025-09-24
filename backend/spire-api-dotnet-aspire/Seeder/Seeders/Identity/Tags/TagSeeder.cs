using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

using SpireCore.Repositories;

using Identity.Tags.Models;
using Identity.Tags.Models.Defaults;

namespace Seeding.Seeders.Identity.Tags;

public static class TagSeeder
{
    /// <summary>
    /// Seeds Tag Categories and Tags.
    /// </summary>
    public static async Task<(int categoriesSeeded, int tagsSeeded)>
        SeedAsync(IServiceProvider sp, bool overwrite, ILogger logger)
    {
        var categoryRepo = sp.GetRequiredService<IRepository<TagCategory>>();
        var tagRepo = sp.GetRequiredService<IRepository<Tag>>();

        int categoriesSeeded = 0, tagsSeeded = 0;

        // Categories
        foreach (var cat in DefaultTagCategories.All)
        {
            var existing = await categoryRepo.FindAsync(x => x.Id == cat.Id)
                        ?? await categoryRepo.FindAsync(x => x.Name == cat.Name);

            if (existing is not null)
            {
                if (overwrite)
                {
                    cat.Id = existing.Id; // stabilize Id
                    await categoryRepo.UpdateAsync(x => x.Id == existing.Id, CloneCategory(existing.Id, cat));
                    categoriesSeeded++;
                }
            }
            else
            {
                await categoryRepo.AddAsync(CloneCategory(cat.Id, cat));
                categoriesSeeded++;
            }
        }

        // Tags
        foreach (var tag in DefaultTags.All)
        {
            // ensure category exists
            var hasCategory = await categoryRepo.FindAsync(x => x.Id == tag.CategoryId);
            if (hasCategory is null)
            {
                var fallbackCat = DefaultTagCategories.All.FirstOrDefault(c => c.Id == tag.CategoryId);
                if (fallbackCat is not null)
                {
                    var existingCat = await categoryRepo.FindAsync(x => x.Id == fallbackCat.Id);
                    if (existingCat is null)
                        await categoryRepo.AddAsync(CloneCategory(fallbackCat.Id, fallbackCat));
                }
            }

            var existing = await tagRepo.FindAsync(x => x.Id == tag.Id)
                        ?? await tagRepo.FindAsync(x => x.DisplayName == tag.DisplayName && x.CategoryId == tag.CategoryId);

            if (existing is not null)
            {
                if (overwrite)
                {
                    tag.Id = existing.Id;
                    await tagRepo.UpdateAsync(x => x.Id == existing.Id, CloneTag(existing.Id, tag));
                    tagsSeeded++;
                }
            }
            else
            {
                await tagRepo.AddAsync(CloneTag(tag.Id, tag));
                tagsSeeded++;
            }
        }

        return (categoriesSeeded, tagsSeeded);
    }

    private static TagCategory CloneCategory(Guid id, TagCategory source) => new TagCategory
    {
        Id = id,
        Name = source.Name,
        Description = source.Description,
        Icon = source.Icon,
        IconType = source.IconType,
        ParentCategoryId = source.ParentCategoryId
    };

    private static Tag CloneTag(Guid id, Tag source) => new Tag
    {
        Id = id,
        DisplayName = source.DisplayName,
        Icon = source.Icon,
        IconType = source.IconType,
        Description = source.Description,
        CategoryId = source.CategoryId,
        ParentTagId = source.ParentTagId
    };
}
