using Genspire.Application.Modules.Authentication.Domain.AuthUserIdentities;
using Genspire.Application.Modules.Authentication.Infrastructure;

namespace Genspire.Application.Modules.Authentication.Domain.RefreshTokens;
public class RefreshToken : BaseAuthEntity
{
    public string Token { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public Guid AuthUserId { get; set; }
    public AuthUserIdentity AuthUser { get; set; } = default!;
    public bool IsRevoked { get; set; } = false;
}