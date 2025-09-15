using SpireCore.Services;
using System.Security.Claims;

namespace SpireCore.API.JWT.Identity;

public interface IJwtIdentityService : ISingletonService
{
    /// <summary>
    /// Generate a JWT for either a user or a service identity.
    /// </summary>
    /// <param name="identity">The identity (user or service).</param>
    /// <param name="extraClaims">Optional additional claims to include.</param>
    /// <param name="expiresInMinutes">Token lifetime in minutes (defaults to configured value).</param>
    string GenerateJwt(
        IJwtIdentity identity,
        IEnumerable<Claim>? extraClaims = null,
        int? expiresInMinutes = null);

    /// <summary>
    /// Validate any JWT and return the ClaimsPrincipal if valid (null otherwise).
    /// </summary>
    ClaimsPrincipal? ValidateJwt(string token);

    /// <summary>
    /// Extract the concrete identity (user or service) from a validated principal.
    /// </summary>
    IJwtIdentity? GetIdentityFromClaims(ClaimsPrincipal principal);

    /// <summary>
    /// Convenience: Try to extract a user identity; returns null if token is not a user token.
    /// </summary>
    IJwtUserIdentity? GetUserFromClaims(ClaimsPrincipal principal);

    /// <summary>
    /// Convenience: Try to extract a service identity; returns null if token is not a service token.
    /// </summary>
    IJwtServiceIdentity? GetServiceFromClaims(ClaimsPrincipal principal);

    // Utility methods working directly from the raw JWT:

    /// <summary>
    /// Parse the token, return the “sub” as GUID if present.
    /// </summary>
    Guid? GetIdFromToken(string jwtToken);

    /// <summary>
    /// Returns true if the token signature is valid and not expired.
    /// </summary>
    bool IsTokenValid(string jwtToken);

    /// <summary>
    /// Returns true if the token has passed its ‘exp’ timestamp.
    /// </summary>
    bool IsExpired(string jwtToken);
}
