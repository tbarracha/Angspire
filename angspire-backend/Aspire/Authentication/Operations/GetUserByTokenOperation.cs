using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Authentication.Domain.Services;
using Microsoft.AspNetCore.Http;
using SpireCore.API.JWT.Identity;
using SpireCore.API.Operations.Attributes;

namespace Authentication.Operations;

public sealed class GetJwtIdentityRequest
{
    public string? Token { get; set; }
}

/// <summary>
/// Returns either a <see cref="JwtUserIdentity"/> or a <see cref="JwtServiceIdentity"/>
/// extracted from a JWT provided via body, Authorization header, or query string.
/// </summary>
[OperationAuthorize]
[OperationRoute("/auth/get/jwtidentity")]
public sealed class GetJwtIdentityByTokenOperation
    : AuthOperation<GetJwtIdentityRequest, IJwtIdentity?>
{
    private readonly IHttpContextAccessor _http;

    public GetJwtIdentityByTokenOperation(AuthenticationService authSvc, IHttpContextAccessor http)
        : base(authSvc)
    {
        _http = http;
    }

    protected override async Task<IJwtIdentity?> HandleAsync(GetJwtIdentityRequest input)
    {
        // 1) Try body
        var token = input?.Token;

        // 2) Fallback: Authorization: Bearer <token>
        if (string.IsNullOrWhiteSpace(token))
            token = TryGetBearerFromHeader();

        // 3) Fallback: ?token=<token>
        if (string.IsNullOrWhiteSpace(token))
            token = TryGetTokenFromQuery();

        if (string.IsNullOrWhiteSpace(token))
            return null;

        token = token.Trim().Trim('\"'); // tolerate `"token"`

        var principal = _authenticationService.ValidateJwt(token);
        if (principal is null)
            return null;

        // Detect service vs user token
        var isService = principal.HasClaim(c => c.Type == "client_id");
        return isService ? MapToServiceIdentity(principal) : MapToUserIdentity(principal);
    }

    /* ------------------------- header/query helpers ------------------------- */
    private string? TryGetBearerFromHeader()
    {
        var auth = _http.HttpContext?.Request?.Headers["Authorization"].ToString();
        if (string.IsNullOrWhiteSpace(auth)) return null;

        const string prefix = "Bearer ";
        return auth.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? auth[prefix.Length..].Trim()
            : null;
    }

    private string? TryGetTokenFromQuery()
        => _http.HttpContext?.Request?.Query["token"].ToString();

    /* ------------------------- mapping helpers ------------------------- */
    private static JwtUserIdentity MapToUserIdentity(ClaimsPrincipal cp)
    {
        // 1) Build raw-claim bag without duplicates; concatenate role/scope-like claims
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

        // 2) Robust ID extraction
        var sub = cp.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                  cp.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(sub, out var guid); // Guid.Empty if parse fails

        // 3) Other basic claims
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

        var scopes = (raw.TryGetValue("scope", out var v) ? v!.ToString() : "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);

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
