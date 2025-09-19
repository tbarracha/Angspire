namespace Genspire.Contracts.Events.Authentication;

public class AuthUserRegisteredEvent : AuthUserEventBase
{
    public DateTime RegisteredAt { get; set; }
}

public sealed class AuthUserLoggedInEvent : AuthUserEventBase
{
    public DateTime LoggedInAt { get; set; }
}