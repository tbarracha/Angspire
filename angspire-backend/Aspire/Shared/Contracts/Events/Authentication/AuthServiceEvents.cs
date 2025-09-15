namespace Shared.Contracts.Events.Authentication;

public sealed class AuthServiceRegisteredEvent : AuthServiceEventBase
{
    public DateTime RegisteredAt { get; set; }
}

public sealed class AuthServiceLoggedInEvent : AuthServiceEventBase
{
    public DateTime LoggedInAt { get; set; }
}