using Genspire.Application.Modules.Authentication.Domain.Services;
using SpireCore.API.JWT.Identity;
using SpireCore.API.Operations.Attributes;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Genspire.Application.Modules.Authentication.Operations;
/// <summary>
/// Returns either a <see cref = "JwtUserIdentity"/> **or**
/// a <see cref = "JwtServiceIdentity"/> extracted from an arbitrary JWT.
/// </summary>
[OperationAuthorize]
[OperationRoute("/auth/get/jwtidentity")]
public sealed class GetJwtIdentityByTokenOperation : AuthOperation<string, IJwtIdentity?>
{
    public GetJwtIdentityByTokenOperation(AuthenticationService authSvc) : base(authSvc)
    {
    }

    protected override async Task<IJwtIdentity?> HandleAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;
        token = token.Trim().Trim('\"'); // tolerate `"token"`
        var principal = _authenticationService.ValidateJwt(token); // helper added to AuthenticationService
        if (principal is null)
            return null;
        // --- Detect if it is a service token ---
        var isService = principal.HasClaim(c => c.Type == "client_id");
        return isService ? MapToServiceIdentity(principal) : MapToUserIdentity(principal);
    }

    /* ------------------------- private helpers ------------------------- */
    private static JwtUserIdentity MapToUserIdentity(ClaimsPrincipal cp)
    {
        // 1️⃣  Build raw-claim bag without duplicates
        var raw = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (var cl in cp.Claims)
        {
            if (cl.Type is ClaimTypes.Role or "role" or "scope")
            {
                raw.TryAdd(cl.Type, cl.Value);
                if (raw[cl.Type] is string s && s != cl.Value)
                    raw[cl.Type] = $"{s} {cl.Value}";
                continue;
            }

            raw.TryAdd(cl.Type, cl.Value); // keep first, drop dups
        }

        // 2️⃣  Robust ID extraction
        var sub = cp.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? cp.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(sub, out var guid); // guid == Guid.Empty if parse fails
        // 3️⃣  Other basic claims
        var email = cp.FindFirstValue(JwtRegisteredClaimNames.Email);
        var given = cp.FindFirstValue(JwtRegisteredClaimNames.GivenName);
        var fam = cp.FindFirstValue(JwtRegisteredClaimNames.FamilyName);
        var name = cp.Identity?.Name ?? cp.FindFirstValue("name") ?? $"{given}{fam}";
        return new JwtUserIdentity
        {
            Id = guid, // never null
            Issuer = cp.FindFirstValue(JwtRegisteredClaimNames.Iss) ?? string.Empty,
            RawClaims = raw,
            Email = email,
            UserName = name,
            DisplayName = name,
            FirstName = given,
            LastName = fam
        };
    }

    private static JwtServiceIdentity MapToServiceIdentity(ClaimsPrincipal cp)
    {
        var raw = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (var cl in cp.Claims)
            raw.TryAdd(cl.Type, cl.Value); // keep first, drop dups
        var scopes = (raw.TryGetValue("scope", out var v) ? v!.ToString() : "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return new JwtServiceIdentity
        {
            Id = Guid.Parse(cp.FindFirstValue(JwtRegisteredClaimNames.Sub)!),
            Issuer = cp.FindFirstValue(JwtRegisteredClaimNames.Iss) ?? string.Empty,
            RawClaims = raw,
            ServiceName = cp.FindFirstValue("client_id") ?? "unknown",
            Scopes = scopes
        };
    }
}