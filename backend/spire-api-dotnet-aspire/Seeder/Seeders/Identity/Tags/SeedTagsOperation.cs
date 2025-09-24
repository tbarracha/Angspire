// File: SeedTagsOperation.cs
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations;
using SpireCore.Repositories;
using Identity.Tags.Models;
using Identity.Tags.Models.Defaults;

namespace Seeding.Seeders.Identity.Tags;

public class SeedTagsRequest
{
    /// <summary>
    /// If true, existing records will be updated (upsert). If false, existing ones are preserved and skipped.
    /// </summary>
    public bool OverwriteExisting { get; set; } = false;
}

public class SeedTagsResponse
{
    public int CategoriesSeeded { get; set; }
    public int TagsSeeded { get; set; }
}

[OperationGroup("Dev")]
[OperationRoute("seed/tags")]
public sealed class SeedTagsOperation : OperationBase<SeedTagsRequest, SeedTagsResponse>
{
    private readonly IRepository<TagCategory> _categoryRepo;
    private readonly IRepository<Tag> _tagRepo;
    public SeedTagsOperation(IRepository<TagCategory> categoryRepo, IRepository<Tag> tagRepo)
    {
        _categoryRepo = categoryRepo;
        _tagRepo = tagRepo;
    }

    protected override async Task<SeedTagsResponse> HandleAsync(SeedTagsRequest request)
    {
        int categoriesSeeded = 0, tagsSeeded = 0;
        // 1) Seed Categories (ensure FK targets exist)
        foreach (var cat in DefaultTagCategories.All)
        {
            // Prefer Id match (deterministic), fallback to Name if needed
            var existing = await _categoryRepo.FindAsync(x => x.Id == cat.Id) ?? await _categoryRepo.FindAsync(x => x.Name == cat.Name);
            if (existing is not null)
            {
                if (request.OverwriteExisting)
                {
                    cat.Id = existing.Id; // keep stable Id
                    await _categoryRepo.UpdateAsync(x => x.Id == existing.Id, CloneCategory(existing.Id, cat));
                    categoriesSeeded++;
                }
                // else skip
            }
            else
            {
                // Insert
                await _categoryRepo.AddAsync(CloneCategory(cat.Id, cat));
                categoriesSeeded++;
            }
        }

        // 2) Seed Tags (after categories)
        foreach (var tag in DefaultTags.All)
        {
            // Ensure category exists (defensive)
            var hasCategory = await _categoryRepo.FindAsync(x => x.Id == tag.CategoryId);
            if (hasCategory is null)
            {
                // Category missing (shouldn’t happen if step 1 ran), try to upsert its category quickly.
                var fallbackCat = DefaultTagCategories.All.FirstOrDefault(c => c.Id == tag.CategoryId);
                if (fallbackCat is not null)
                {
                    var existingCat = await _categoryRepo.FindAsync(x => x.Id == fallbackCat.Id);
                    if (existingCat is null)
                        await _categoryRepo.AddAsync(CloneCategory(fallbackCat.Id, fallbackCat));
                }
            }

            // Prefer Id match (deterministic), fallback to (DisplayName + CategoryId)
            var existing = await _tagRepo.FindAsync(x => x.Id == tag.Id) ?? await _tagRepo.FindAsync(x => x.DisplayName == tag.DisplayName && x.CategoryId == tag.CategoryId);
            if (existing is not null)
            {
                if (request.OverwriteExisting)
                {
                    tag.Id = existing.Id; // keep stable Id
                    await _tagRepo.UpdateAsync(x => x.Id == existing.Id, CloneTag(existing.Id, tag));
                    tagsSeeded++;
                }
                // else skip
            }
            else
            {
                await _tagRepo.AddAsync(CloneTag(tag.Id, tag));
                tagsSeeded++;
            }
        }

        return new SeedTagsResponse
        {
            CategoriesSeeded = categoriesSeeded,
            TagsSeeded = tagsSeeded
        };
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