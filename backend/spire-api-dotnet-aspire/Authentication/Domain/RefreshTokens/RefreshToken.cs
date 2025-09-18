using Authentication.Domain.AuthUserIdentities;
using Authentication.Infrastructure;

namespace Authentication.Domain.RefreshTokens;

public class RefreshToken : BaseAuthEntity
{
    public string Token { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public Guid AuthUserId { get; set; }
    public AuthUserIdentity AuthUser { get; set; } = default!;
    public bool IsRevoked { get; set; } = false;
}