// File: App.Shared/Seeder/AppSeeder.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using SpireCore.Repositories;

// ===== Domain =====
using Authentication.Domain.AuthUserIdentities;

using App.Core.Identity.Groups.Models;
using App.Core.Identity.Tags.Models;

// ===== Defaults =====
using App.Shared.Defaults;

namespace App.Shared.Seeder;

public static class GlobalSeeder
{
    /// <summary>
    /// High-level options to control what gets seeded.
    /// </summary>
    public sealed class SeedOptions
    {
        public bool OverwriteExisting { get; set; } = false;

        // toggles
        public bool SeedGroupDefaults { get; set; } = true;
        public bool EnsureUsersHaveDefaultTeam { get; set; } = true;
        public bool SeedTags { get; set; } = true;
    }

    /// <summary>
    /// Call this after registering all services & repositories.
    /// Typically invoked at the end of Program.cs after building the app:
    /// await app.Services.SeedBusinessAsync(opts => { opts.OverwriteExisting = true; opts.SeedOllamaLocalModels = true; });
    /// </summary>
    public static async Task SeedAsync(this IServiceProvider services, Action<SeedOptions>? configure = null)
    {
        var opts = new SeedOptions();
        configure?.Invoke(opts);

        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("BusinessSeeder");

        logger.LogInformation("==== BusinessSeeder START ====");

        if (opts.SeedGroupDefaults)
        {
            var (typesSeeded, typesUpdated, rolesSeeded, rolesUpdated) =
                await SeedGroupDefaultsInternalAsync(sp, opts.OverwriteExisting, logger);
            logger.LogInformation("GroupDefaults: Types +{TypesSeeded}/~{TypesUpdated}, Roles +{RolesSeeded}/~{RolesUpdated}",
                typesSeeded, typesUpdated, rolesSeeded, rolesUpdated);
        }

        if (opts.EnsureUsersHaveDefaultTeam)
        {
            var (created, failed) = await EnsureUsersHaveDefaultTeamInternalAsync(sp, logger);
            logger.LogInformation("EnsureUsersHaveDefaultTeam: Created {Created}, Failed {Failed}", created, failed);
        }

        if (opts.SeedTags)
        {
            var (categoriesSeeded, tagsSeeded) =
                await SeedTagsInternalAsync(sp, opts.OverwriteExisting, logger);
            logger.LogInformation("Tags: Categories +{Categories}, Tags +{Tags}", categoriesSeeded, tagsSeeded);
        }

        logger.LogInformation("==== BusinessSeeder END ====");
    }

    // ============================================================
    // 1) Group Defaults (Types + Roles)
    // ============================================================
    private static async Task<(int typesSeeded, int typesUpdated, int rolesSeeded, int rolesUpdated)>
        SeedGroupDefaultsInternalAsync(IServiceProvider sp, bool overwrite, ILogger logger)
    {
        var typeRepo = sp.GetRequiredService<IRepository<GroupType>>();
        var roleRepo = sp.GetRequiredService<IRepository<GroupRole>>();

        int typesSeeded = 0, typesUpdated = 0, rolesSeeded = 0, rolesUpdated = 0;

        // Types
        {
            var defaults = DefaultGroupTypes.All;
            var existing = await typeRepo.GetAllAsync();
            foreach (var d in defaults)
            {
                var found = existing.FirstOrDefault(x => x.Id == d.Id)
                         ?? existing.FirstOrDefault(x => x.Name.Equals(d.Name, StringComparison.OrdinalIgnoreCase));
                if (found is null)
                {
                    var entity = new GroupType { Id = d.Id, Name = d.Name, Description = d.Description };
                    await typeRepo.AddAsync(entity);
                    typesSeeded++;
                }
                else if (overwrite)
                {
                    found.Name = d.Name;
                    found.Description = d.Description;
                    await typeRepo.UpdateAsync(x => x.Id == found.Id, found);
                    typesUpdated++;
                }
            }
        }

        // Roles
        {
            var defaults = DefaultGroupRoles.All;
            var existing = await roleRepo.GetAllAsync();
            foreach (var d in defaults)
            {
                var found = existing.FirstOrDefault(x => x.Id == d.Id)
                         ?? existing.FirstOrDefault(x => x.Name.Equals(d.Name, StringComparison.OrdinalIgnoreCase) && x.GroupId == d.GroupId);
                if (found is null)
                {
                    var entity = new GroupRole
                    {
                        Id = d.Id,
                        GroupId = d.GroupId, // null => global role
                        Name = d.Name,
                        Description = d.Description
                    };
                    await roleRepo.AddAsync(entity);
                    rolesSeeded++;
                }
                else if (overwrite)
                {
                    found.GroupId = d.GroupId;
                    found.Name = d.Name;
                    found.Description = d.Description;
                    await roleRepo.UpdateAsync(x => x.Id == found.Id, found);
                    rolesUpdated++;
                }
            }
        }

        return (typesSeeded, typesUpdated, rolesSeeded, rolesUpdated);
    }

    // ============================================================
    // 2) Ensure Users Have Default Team
    // ============================================================
    private static async Task<(int created, int failed)> EnsureUsersHaveDefaultTeamInternalAsync(IServiceProvider sp, ILogger logger)
    {
        var userManager = sp.GetRequiredService<UserManager<AuthUserIdentity>>();
        var membershipRepo = sp.GetRequiredService<IRepository<GroupMembership>>();
        var groupRepo = sp.GetRequiredService<IRepository<Group>>();
        var groupTypeRepo = sp.GetRequiredService<IRepository<GroupType>>();
        var roleRepo = sp.GetRequiredService<IRepository<GroupRole>>();

        var allUsers = userManager.Users.ToList();
        var memberships = (await membershipRepo.GetAllAsync()).ToList();
        var groups = (await groupRepo.GetAllAsync()).ToList();
        var groupTypes = (await groupTypeRepo.GetAllAsync()).ToList();

        var teamType = groupTypes.FirstOrDefault(gt => gt.Id == DefaultGroupTypes.Team.Id)
                    ?? groupTypes.FirstOrDefault(gt => gt.Name.Equals(DefaultGroupTypes.Team.Name, StringComparison.OrdinalIgnoreCase));
        if (teamType is null)
        {
            teamType = DefaultGroupTypes.Team;
            await groupTypeRepo.AddAsync(teamType);
            logger.LogInformation("Seeded missing default GroupType: {Name}", teamType.Name);
            groupTypes.Add(teamType);
        }

        var allRoles = (await roleRepo.GetAllAsync()).ToList();
        var ownerRole = allRoles.FirstOrDefault(r => r.Id == DefaultGroupRoles.Owner.Id)
                     ?? allRoles.FirstOrDefault(r => r.Name.Equals(DefaultGroupRoles.Owner.Name, StringComparison.OrdinalIgnoreCase) && r.GroupId == null);
        if (ownerRole is null)
        {
            ownerRole = DefaultGroupRoles.Owner;
            await roleRepo.AddAsync(ownerRole);
            logger.LogInformation("Seeded missing default GroupRole: {Name}", ownerRole.Name);
            allRoles.Add(ownerRole);
        }

        var teamGroupIds = groups.Where(g => g.GroupTypeId == teamType.Id).Select(g => g.Id).ToHashSet();
        int created = 0, failed = 0;

        foreach (var user in allUsers)
        {
            bool isOwnerOfAnyTeam = memberships.Any(m => m.UserId == user.Id && m.IsGroupOwner && teamGroupIds.Contains(m.GroupId));
            bool alreadyOwnsTeamGroup = groups.Any(g => g.OwnerUserId == user.Id && g.GroupTypeId == teamType.Id);
            if (isOwnerOfAnyTeam || alreadyOwnsTeamGroup) continue;

            var group = new Group
            {
                Id = Guid.NewGuid(),
                Name = $"{user.UserName}'s Team",
                GroupTypeId = teamType.Id,
                OwnerUserId = user.Id,
                Description = $"Default team for {user.UserName}"
            };

            try
            {
                await groupRepo.AddAsync(group);
                var membership = new GroupMembership
                {
                    Id = Guid.NewGuid(),
                    GroupId = group.Id,
                    UserId = user.Id,
                    RoleId = ownerRole.Id,
                    State = "Active",
                    IsGroupOwner = true
                };
                await membershipRepo.AddAsync(membership);

                groups.Add(group);
                teamGroupIds.Add(group.Id);
                memberships.Add(membership);
                created++;
            }
            catch
            {
                failed++;
            }
        }

        return (created, failed);
    }

    // ============================================================
    // 3) Tags (Categories + Tags)
    // ============================================================
    private static async Task<(int categoriesSeeded, int tagsSeeded)>
        SeedTagsInternalAsync(IServiceProvider sp, bool overwrite, ILogger logger)
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
                    cat.Id = existing.Id; // stable Id
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

        static TagCategory CloneCategory(Guid id, TagCategory source) => new TagCategory
        {
            Id = id,
            Name = source.Name,
            Description = source.Description,
            Icon = source.Icon,
            IconType = source.IconType,
            ParentCategoryId = source.ParentCategoryId
        };
        static Tag CloneTag(Guid id, Tag source) => new Tag
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
}
