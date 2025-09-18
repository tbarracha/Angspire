using Shared.Contracts.Events.Authentication;
using SpireCore.API.JWT.Identity;

/// <summary>
/// Base for *human-user* auth events (implements <see cref="IJwtUserIdentity"/>).
/// </summary>
public abstract class AuthUserEventBase : AuthEventBase, IJwtUserIdentity
{
    public Guid AuthUserId { get; set; }
    public string Email { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }

    public override bool IsService => false;
}