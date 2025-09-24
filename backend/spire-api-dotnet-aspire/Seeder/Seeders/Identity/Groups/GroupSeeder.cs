using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

using SpireCore.Repositories;

// ===== Domain =====
using Authentication.Domain.AuthUserIdentities;

using Identity.Groups.Models;

namespace Seeding.Seeders.Identity.Groups;

public static class GroupSeeder
{
    /// <summary>
    /// Seeds default Group Types and Roles.
    /// </summary>
    public static async Task<(int typesSeeded, int typesUpdated, int rolesSeeded, int rolesUpdated)>
        SeedDefaultsAsync(IServiceProvider sp, bool overwrite, ILogger logger)
    {
        var typeRepo = sp.GetRequiredService<IRepository<GroupType>>();
        var roleRepo = sp.GetRequiredService<IRepository<GroupRole>>();

        int typesSeeded = 0, typesUpdated = 0, rolesSeeded = 0, rolesUpdated = 0;

        // Types
        {
            var defaults = DefaultGroupTypes.All;
            var existing = (await typeRepo.GetAllAsync()).ToList();

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
            var existing = (await roleRepo.GetAllAsync()).ToList();

            foreach (var d in defaults)
            {
                var found = existing.FirstOrDefault(x => x.Id == d.Id)
                         ?? existing.FirstOrDefault(x =>
                                x.Name.Equals(d.Name, StringComparison.OrdinalIgnoreCase)
                                && x.GroupId == d.GroupId);

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

    /// <summary>
    /// Ensures every user owns a default Team group with Owner role.
    /// </summary>
    public static async Task<(int created, int failed)> EnsureUsersHaveDefaultTeamAsync(IServiceProvider sp, ILogger logger)
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

        // Ensure Team GroupType exists
        var teamType = groupTypes.FirstOrDefault(gt => gt.Id == DefaultGroupTypes.Team.Id)
                    ?? groupTypes.FirstOrDefault(gt => gt.Name.Equals(DefaultGroupTypes.Team.Name, StringComparison.OrdinalIgnoreCase));
        if (teamType is null)
        {
            teamType = DefaultGroupTypes.Team;
            await groupTypeRepo.AddAsync(teamType);
            logger.LogInformation("Seeded missing default GroupType: {Name}", teamType.Name);
            groupTypes.Add(teamType);
        }

        // Ensure Owner role exists (global)
        var allRoles = (await roleRepo.GetAllAsync()).ToList();
        var ownerRole = allRoles.FirstOrDefault(r => r.Id == DefaultGroupRoles.Owner.Id)
                     ?? allRoles.FirstOrDefault(r =>
                            r.Name.Equals(DefaultGroupRoles.Owner.Name, StringComparison.OrdinalIgnoreCase)
                            && r.GroupId == null);
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
            bool alreadyOwnsTeam = groups.Any(g => g.OwnerUserId == user.Id && g.GroupTypeId == teamType.Id);
            if (isOwnerOfAnyTeam || alreadyOwnsTeam) continue;

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
}
