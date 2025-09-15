using SpireCore.API.JWT.Identity;
using SpireCore.Events.Dispatcher;

namespace Shared.Contracts.Events.Authentication;

/*  Core information every auth event must carry:
 *   • IJwtIdentity fields (Id, Issuer, RawClaims, IsService)
 *   • Token pair issued at the time of the event (Access / Refresh)
 */
public abstract class AuthEventBase : IJwtIdentity, IDomainEvent
{
    // IHasId<Guid>
    public Guid Id { get; set; }

    // IJwtIdentity
    public string Issuer { get; set; } = default!;
    public IReadOnlyDictionary<string, object> RawClaims { get; set; }
        = new Dictionary<string, object>();

    // Decided by the derived class
    public abstract bool IsService { get; }

    // Tokens (always present)
    public string AccessToken { get; set; } = default!;
    public string RefreshToken { get; set; } = default!;
    public string? ImageUrl { get; set; }
}
