using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SpireCore.API.JWT.Identity;

public class JwtIdentityService : IJwtIdentityService
{
    private readonly IConfiguration _config;
    private readonly byte[] _key;

    public JwtIdentityService(IConfiguration config)
    {
        _config = config;
        _key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);
    }

    public string GenerateJwt(
        IJwtIdentity identity,
        IEnumerable<Claim>? extraClaims = null,
        int? expiresInMinutes = null)
    {
        // Base claims
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, identity.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Iss, _config["Jwt:Issuer"]!),
            new Claim(JwtRegisteredClaimNames.Aud, _config["Jwt:Audience"]!),
            new Claim(JwtRegisteredClaimNames.Iat,
                      DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                      ClaimValueTypes.Integer64)
        };

        // User vs Service
        if (!identity.IsService && identity is IJwtUserIdentity u)
        {
            if (!string.IsNullOrEmpty(u.Email))
                claims.Add(new Claim("email", u.Email));
            if (!string.IsNullOrEmpty(u.UserName))
                claims.Add(new Claim("userName", u.UserName));
            if (!string.IsNullOrEmpty(u.DisplayName))
                claims.Add(new Claim("displayName", u.DisplayName));
            if (!string.IsNullOrEmpty(u.FirstName))
                claims.Add(new Claim("firstName", u.FirstName));
            if (!string.IsNullOrEmpty(u.LastName))
                claims.Add(new Claim("lastName", u.LastName));
            if (!string.IsNullOrEmpty(u.ImageUrl))
                claims.Add(new Claim("image_url", u.ImageUrl));
        }
        else if (identity.IsService && identity is IJwtServiceIdentity s)
        {
            claims.Add(new Claim("client_id", s.ServiceName));
            foreach (var scope in s.Scopes)
                claims.Add(new Claim("scope", scope));
            if (!string.IsNullOrEmpty(s.ImageUrl))
                claims.Add(new Claim("image_url", s.ImageUrl));
        }

        // Extras
        if (extraClaims != null)
            claims.AddRange(extraClaims);

        // Lifetime
        var defaultMin = int.TryParse(_config["Jwt:AccessTokenMinutes"], out var cfgMin)
                            ? cfgMin : 1440;
        var exp = DateTime.UtcNow.AddMinutes(expiresInMinutes ?? defaultMin);

        // Create token
        var creds = new SigningCredentials(
                        new SymmetricSecurityKey(_key),
                        SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: exp,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateJwt(string token)
    {
        token = token?.Trim().Trim('"');

        var handler = new JwtSecurityTokenHandler();
        var parms = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = _config["Jwt:Issuer"],
            ValidAudience = _config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(_key),
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        try
        {
            return handler.ValidateToken(token, parms, out _);
        }
        catch
        {
            return null;
        }
    }

    public IJwtIdentity? GetIdentityFromClaims(ClaimsPrincipal principal)
    {
        if (principal?.Identity?.IsAuthenticated != true)
            return null;

        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
              ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(sub, out var id))
            return null;

        var raw = ToUniqueClaimDict(principal.Claims);

        var imageUrl = principal.FindFirstValue("image_url"); // Or whatever claim you use

        // service tokens carry client_id
        var clientId = principal.FindFirstValue("client_id");
        if (!string.IsNullOrEmpty(clientId))
            return new JwtServiceIdentity
            {
                Id = id,
                Issuer = principal.FindFirstValue(JwtRegisteredClaimNames.Iss)
                         ?? principal.FindFirstValue("iss")!,
                RawClaims = raw,
                ServiceName = clientId,
                Scopes = principal.FindAll("scope").Select(c => c.Value).ToList(),
                ImageUrl = imageUrl
            };

        // otherwise user token
        return new JwtUserIdentity
        {
            Id = id,
            Issuer = principal.FindFirstValue(JwtRegisteredClaimNames.Iss)
                     ?? principal.FindFirstValue("iss")!,
            RawClaims = raw,
            Email = principal.FindFirstValue("email")
                         ?? principal.FindFirstValue(ClaimTypes.Email),
            UserName = principal.FindFirstValue("userName")
                         ?? principal.FindFirstValue(ClaimTypes.Name),
            DisplayName = principal.FindFirstValue("displayName"),
            FirstName = principal.FindFirstValue("firstName"),
            LastName = principal.FindFirstValue("lastName"),
            ImageUrl = imageUrl
        };
    }

    public IJwtUserIdentity? GetUserFromClaims(ClaimsPrincipal principal)
        => GetIdentityFromClaims(principal) as IJwtUserIdentity;

    public IJwtServiceIdentity? GetServiceFromClaims(ClaimsPrincipal principal)
        => GetIdentityFromClaims(principal) as IJwtServiceIdentity;

    public Guid? GetIdFromToken(string jwtToken)
    {
        var principal = ValidateJwt(jwtToken);
        return principal is null
            ? null
            : Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub));
    }

    public bool IsTokenValid(string jwtToken)
        => ValidateJwt(jwtToken) is not null;

    public bool IsExpired(string jwtToken)
    {
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(jwtToken))
            return true;

        var token = handler.ReadJwtToken(jwtToken);
        return token.ValidTo < DateTime.UtcNow;
    }

    private static IReadOnlyDictionary<string, object> ToUniqueClaimDict(
    IEnumerable<Claim> claims)
    {
        var dict = new Dictionary<string, object>(StringComparer.Ordinal);
        foreach (var c in claims)
        {
            if (!dict.ContainsKey(c.Type))
                dict[c.Type] = c.Value;
        }
        return dict;
    }

}
