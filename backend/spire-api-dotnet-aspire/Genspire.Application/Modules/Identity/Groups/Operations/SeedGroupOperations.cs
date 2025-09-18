using Genspire.Application.Modules.Authentication.Domain.AuthUserIdentities;
using Genspire.Application.Modules.Identity.Groups.Domain.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Identity.Groups.Operations;
// =========================
// DTOs
// =========================
public class SeedGroupDefaultsRequestDto
{
    /// <summary>When true, overwrite existing GroupTypes and GroupRoles that match by Id or Name.</summary>
    public bool OverwriteExisting { get; set; } = false;
}

public class SeedGroupDefaultsResponseDto
{
    // Types
    public int TypesSeeded { get; set; }
    public int TypesUpdated { get; set; }
    public List<GroupTypeDto> SeededTypes { get; set; } = new();
    public List<GroupTypeDto> UpdatedTypes { get; set; } = new();
    // Roles
    public int RolesSeeded { get; set; }
    public int RolesUpdated { get; set; }
    public List<GroupRoleDto> SeededRoles { get; set; } = new();
    public List<GroupRoleDto> UpdatedRoles { get; set; } = new();
}

public class EnsureUsersHaveDefaultTeamRequestDto
{
}

public class EnsureUsersHaveDefaultTeamResponseDto
{
    public List<AuthUserIdentityDto> TeamsCreated { get; set; } = new();
    public List<AuthUserIdentityDto> FailedToCreateTeam { get; set; } = new();
}

public class AuthUserIdentityDto
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? UserName { get; set; }
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

// =========================
// Seed Group Defaults (Types + Roles)
// =========================
[OperationGroup("Dev")]
[OperationRoute("group/seed/defaults")]
public sealed class SeedGroupDefaults : OperationBase<SeedGroupDefaultsRequestDto, SeedGroupDefaultsResponseDto>
{
    private readonly IRepository<GroupType> _typeRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    public SeedGroupDefaults(IRepository<GroupType> typeRepo, IRepository<GroupRole> roleRepo)
    {
        _typeRepo = typeRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<SeedGroupDefaultsResponseDto> HandleAsync(SeedGroupDefaultsRequestDto request)
    {
        var resp = new SeedGroupDefaultsResponseDto();
        // ----- Seed Types -----
        {
            var defaults = DefaultGroupTypes.All;
            var existing = await _typeRepo.GetAllAsync();
            foreach (var d in defaults)
            {
                var found = existing.FirstOrDefault(x => x.Id == d.Id) ?? existing.FirstOrDefault(x => x.Name.Equals(d.Name, StringComparison.OrdinalIgnoreCase));
                if (found is null)
                {
                    var entity = new GroupType
                    {
                        Id = d.Id,
                        Name = d.Name,
                        Description = d.Description
                    };
                    await _typeRepo.AddAsync(entity);
                    resp.SeededTypes.Add(GroupTypeMapper.ToDto(entity));
                }
                else if (request.OverwriteExisting)
                {
                    found.Name = d.Name;
                    found.Description = d.Description;
                    await _typeRepo.UpdateAsync(x => x.Id == found.Id, found);
                    resp.UpdatedTypes.Add(GroupTypeMapper.ToDto(found));
                }
            }

            resp.TypesSeeded = resp.SeededTypes.Count;
            resp.TypesUpdated = resp.UpdatedTypes.Count;
        }

        // ----- Seed Roles -----
        {
            var defaults = DefaultGroupRoles.All;
            var existing = await _roleRepo.GetAllAsync();
            foreach (var d in defaults)
            {
                var found = existing.FirstOrDefault(x => x.Id == d.Id) ?? existing.FirstOrDefault(x => x.Name.Equals(d.Name, StringComparison.OrdinalIgnoreCase) && x.GroupId == d.GroupId);
                if (found is null)
                {
                    var entity = new GroupRole
                    {
                        Id = d.Id,
                        GroupId = d.GroupId, // null => global role
                        Name = d.Name,
                        Description = d.Description
                    };
                    await _roleRepo.AddAsync(entity);
                    resp.SeededRoles.Add(GroupRoleMapper.ToDto(entity));
                }
                else if (request.OverwriteExisting)
                {
                    found.GroupId = d.GroupId;
                    found.Name = d.Name;
                    found.Description = d.Description;
                    await _roleRepo.UpdateAsync(x => x.Id == found.Id, found);
                    resp.UpdatedRoles.Add(GroupRoleMapper.ToDto(found));
                }
            }

            resp.RolesSeeded = resp.SeededRoles.Count;
            resp.RolesUpdated = resp.UpdatedRoles.Count;
        }

        return resp;
    }
}

// =========================
// Ensure Users Have Default Team
// =========================
[OperationGroup("Dev")]
[OperationRoute("group/seed/users-default-group")]
public sealed class EnsureUsersHaveDefaultTeamOperation : OperationBase<EnsureUsersHaveDefaultTeamRequestDto, EnsureUsersHaveDefaultTeamResponseDto>
{
    private readonly UserManager<AuthUserIdentity> _userManager;
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<Group> _groupRepo;
    private readonly IRepository<GroupType> _groupTypeRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    private readonly ILogger<EnsureUsersHaveDefaultTeamOperation> _logger;
    public EnsureUsersHaveDefaultTeamOperation(UserManager<AuthUserIdentity> userManager, IRepository<GroupMembership> membershipRepo, IRepository<Group> groupRepo, IRepository<GroupType> groupTypeRepo, IRepository<GroupRole> roleRepo, ILogger<EnsureUsersHaveDefaultTeamOperation> logger)
    {
        _userManager = userManager;
        _membershipRepo = membershipRepo;
        _groupRepo = groupRepo;
        _groupTypeRepo = groupTypeRepo;
        _roleRepo = roleRepo;
        _logger = logger;
    }

    protected override async Task<EnsureUsersHaveDefaultTeamResponseDto> HandleAsync(EnsureUsersHaveDefaultTeamRequestDto request)
    {
        var allUsers = _userManager.Users.ToList();
        var memberships = await _membershipRepo.GetAllAsync();
        var groups = await _groupRepo.GetAllAsync();
        var groupTypes = await _groupTypeRepo.GetAllAsync();
        var teamType = groupTypes.FirstOrDefault(gt => gt.Id == DefaultGroupTypes.Team.Id) ?? groupTypes.FirstOrDefault(gt => gt.Name.Equals(DefaultGroupTypes.Team.Name, StringComparison.OrdinalIgnoreCase));
        if (teamType is null)
        {
            teamType = DefaultGroupTypes.Team;
            await _groupTypeRepo.AddAsync(teamType);
            _logger.LogInformation("Seeded missing default GroupType: {Name}", teamType.Name);
        }

        var allRoles = await _roleRepo.GetAllAsync();
        var ownerRole = allRoles.FirstOrDefault(r => r.Id == DefaultGroupRoles.Owner.Id) ?? allRoles.FirstOrDefault(r => r.Name.Equals(DefaultGroupRoles.Owner.Name, StringComparison.OrdinalIgnoreCase) && r.GroupId == null);
        if (ownerRole is null)
        {
            ownerRole = DefaultGroupRoles.Owner;
            await _roleRepo.AddAsync(ownerRole);
            _logger.LogInformation("Seeded missing default GroupRole: {Name}", ownerRole.Name);
        }

        var teamGroupIds = groups.Where(g => g.GroupTypeId == teamType.Id).Select(g => g.Id).ToHashSet();
        var teamsCreated = new List<AuthUserIdentityDto>();
        var failedToCreate = new List<AuthUserIdentityDto>();
        foreach (var user in allUsers)
        {
            bool hasOwnerMembershipInTeam = memberships.Any(m => m.UserId == user.Id && m.IsGroupOwner && teamGroupIds.Contains(m.GroupId));
            bool alreadyOwnsTeamGroup = groups.Any(g => g.OwnerUserId == user.Id && g.GroupTypeId == teamType.Id);
            if (hasOwnerMembershipInTeam || alreadyOwnsTeamGroup)
                continue;
            var teamName = $"{user.UserName}'s Team";
            var group = new Group
            {
                Id = Guid.NewGuid(),
                Name = teamName,
                GroupTypeId = teamType.Id,
                OwnerUserId = user.Id,
                Description = $"Default team for {user.UserName}"
            };
            try
            {
                await _groupRepo.AddAsync(group);
                var membership = new GroupMembership
                {
                    Id = Guid.NewGuid(),
                    GroupId = group.Id,
                    UserId = user.Id,
                    RoleId = ownerRole.Id,
                    State = "Active",
                    IsGroupOwner = true
                };
                await _membershipRepo.AddAsync(membership);
                teamsCreated.Add(new AuthUserIdentityDto { Id = user.Id, Email = user.Email, UserName = user.UserName, DisplayName = user.DisplayName, FirstName = user.FirstName, LastName = user.LastName });
                groups = groups.Append(group).ToList();
                teamGroupIds.Add(group.Id);
                memberships = memberships.Append(membership).ToList();
            }
            catch
            {
                failedToCreate.Add(new AuthUserIdentityDto { Id = user.Id, Email = user.Email, UserName = user.UserName, DisplayName = user.DisplayName, FirstName = user.FirstName, LastName = user.LastName });
            }
        }

        return new EnsureUsersHaveDefaultTeamResponseDto
        {
            TeamsCreated = teamsCreated,
            FailedToCreateTeam = failedToCreate
        };
    }
}