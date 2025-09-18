using Authentication.Domain.AuthUserIdentities;
using System.Security.Claims;

namespace Authentication.Domain.Services;
/// <summary>
/// Contract for authenticating *humans* and *machine / service* principals.
/// </summary>
public interface IAuthIdentityService
{
    /* ---------- Human users ---------- */
    Task<(string AccessToken, string RefreshToken)> RegisterUserAsync(string email, string password, string firstName, string lastName, string? username = null);
    Task<(string AccessToken, string RefreshToken)> LoginAsync(string identifier, string password);
    /* ---------- Services / clients ---------- */
    Task<(string AccessToken, string RefreshToken)> RegisterServiceAsync(string serviceName, string clientSecret, IEnumerable<string>? scopes = null);
    /* ---------- Shared ---------- */
    Task LogoutAsync(string refreshToken);
    Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(string token);
    Task<AuthUserIdentity?> GetAuthIdentityByIdAsync(Guid id);
    Task<AuthUserIdentity?> GetCurrentUserAsync(ClaimsPrincipal principal);
    Task<AuthUserIdentity?> GetUserByTokenAsync(string jwtToken);
    ClaimsPrincipal? ValidateJwt(string token);
}