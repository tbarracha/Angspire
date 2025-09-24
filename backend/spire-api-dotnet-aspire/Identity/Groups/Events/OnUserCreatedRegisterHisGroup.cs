using Identity.Groups.Services;
using Shared.Contracts.Events.Authentication;
using SpireCore.Events.Dispatcher;

namespace Identity.Groups.Events;

public class OnUserCreatedRegisterHisGroup : IEventHandler<AuthUserRegisteredEvent>
{
    private readonly GroupService _groupService;
    public OnUserCreatedRegisterHisGroup(GroupService groupService)
    {
        _groupService = groupService;
    }

    public async Task HandleEventAsync(AuthUserRegisteredEvent @event, CancellationToken cancellationToken = default)
    {
        var userId = @event.AuthUserId;
        var displayName = !string.IsNullOrWhiteSpace(@event.DisplayName) ? @event.DisplayName!.Trim() : @event.UserName?.Trim() ?? "User";
        var groupName = $"{displayName}'s Team";
        // Use the service; will auto-create the group type "Team" if missing
        await _groupService.CreateGroupOfTypeForUserAsync(userId: userId, groupTypeName: "Team", groupName: groupName, description: $"Personal team for user {displayName}");
    }
}