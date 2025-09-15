using Genspire.Contracts.Events.Authentication;

using SpireCore.API.JWT.Identity;

/// <summary>
/// Base for *service / machine* auth events (implements <see cref="IJwtServiceIdentity"/>).
/// </summary>
public abstract class AuthServiceEventBase : AuthEventBase, IJwtServiceIdentity
{
    public Guid ServiceId { get; set; }
    public string ServiceName { get; set; } = default!;
    public IReadOnlyCollection<string> Scopes { get; set; } = Array.Empty<string>();

    public override bool IsService => true;
}
