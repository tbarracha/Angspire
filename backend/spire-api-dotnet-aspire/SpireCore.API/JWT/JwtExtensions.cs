using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SpireCore.API.JWT.Identity;
using SpireCore.Utils;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SpireCore.API.JWT;

public static class JwtExtensions
{
    /// <summary>
    /// Registers:
    ///   1. IJwtServiceIdentity created from configuration.ServiceIdentity
    ///   2. IJwtIdentityService
    ///   3. JWT authentication schemes ("Bearer" for users, "ServiceBearer" for services)
    ///   4. Authorization policies ("UserJwt" and "ServiceJwt")
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. Read and validate JWT settings
        var jwtSection = configuration.GetSection("Jwt");
        var jwtKey = jwtSection["Key"];
        var jwtIssuer = jwtSection["Issuer"];
        var jwtAudience = jwtSection["Audience"];
        var jwtLifetime = jwtSection["AccessTokenMinutes"];

        if (string.IsNullOrWhiteSpace(jwtKey) ||
            string.IsNullOrWhiteSpace(jwtIssuer) ||
            string.IsNullOrWhiteSpace(jwtAudience))
        {
            throw new InvalidOperationException(
                "Jwt:Key, Jwt:Issuer, or Jwt:Audience is not configured");
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        // 2. Bind ServiceIdentity section and create a JwtServiceIdentity
        var svcSection = configuration.GetSection("ServiceIdentity");
        var serviceName = svcSection["ServiceName"];
        if (string.IsNullOrWhiteSpace(serviceName))
        {
            throw new InvalidOperationException(
                "ServiceIdentity:ServiceName is not configured");
        }

        // Deterministic GUID from service name
        var serviceId = GuidUtility.CreateDeterministicGuid(serviceName);

        var serviceIdentity = new JwtServiceIdentity
        {
            Id = serviceId,
            Issuer = jwtIssuer,
            RawClaims = new Dictionary<string, object>(),
            ServiceName = serviceName,
            Scopes = Array.Empty<string>()
        };

        services.AddSingleton<IJwtServiceIdentity>(serviceIdentity);

        // 3. Register the unified JWT identity service
        services.AddSingleton<IJwtIdentityService, JwtIdentityService>();

        // 4. Configure authentication schemes
        services.AddAuthentication(options =>
        {
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = signingKey,
                ClockSkew = TimeSpan.FromMinutes(2),
                NameClaimType = ClaimTypes.NameIdentifier
            };
        })
        .AddJwtBearer("ServiceBearer", options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = signingKey,
                ClockSkew = TimeSpan.FromMinutes(2)
            };
        });

        // 5. Add authorization policies
        services.AddAuthorization(options =>
        {
            options.AddPolicy("UserJwt", policy =>
                policy.RequireAuthenticatedUser()
                      .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme));

            options.AddPolicy("ServiceJwt", policy =>
                policy.RequireAuthenticatedUser()
                      .AddAuthenticationSchemes("ServiceBearer"));

            options.DefaultPolicy = options.GetPolicy("UserJwt")!;
        });

        return services;
    }

    /// <summary>
    /// Converts a user identity into JWT claims.
    /// </summary>
    public static IEnumerable<Claim> ToClaims(this IJwtUserIdentity user)
    {
        yield return new Claim(ClaimTypes.NameIdentifier, user.Id.ToString());

        if (!string.IsNullOrWhiteSpace(user.Email))
            yield return new Claim(ClaimTypes.Email, user.Email);

        if (!string.IsNullOrWhiteSpace(user.UserName))
            yield return new Claim(ClaimTypes.Name, user.UserName);

        if (!string.IsNullOrWhiteSpace(user.DisplayName))
            yield return new Claim("display_name", user.DisplayName);

        if (!string.IsNullOrWhiteSpace(user.FirstName))
            yield return new Claim("first_name", user.FirstName);

        if (!string.IsNullOrWhiteSpace(user.LastName))
            yield return new Claim("last_name", user.LastName);
    }

    /// <summary>
    /// Converts a service identity into JWT claims (client_id + scopes).
    /// </summary>
    public static IEnumerable<Claim> ToClaims(this IJwtServiceIdentity service)
    {
        yield return new Claim(ClaimTypes.NameIdentifier, service.Id.ToString());
        yield return new Claim("client_id", service.ServiceName);

        foreach (var scope in service.Scopes ?? Array.Empty<string>())
            yield return new Claim("scope", scope);
    }

    /// <summary>
    /// **Unified** claim factory – always emits the <c>NameIdentifier</c> claim and
    /// then delegates to the concrete user/service rules.  
    /// Keeps all claim logic in one place so nothing ever forgets the user Id.
    /// </summary>
    public static IEnumerable<Claim> BuildClaims(this IJwtIdentity identity)
    {
        // The ID claim is mandatory for both flavours
        yield return new Claim(ClaimTypes.NameIdentifier, identity.Id.ToString());

        switch (identity)
        {
            // ------ User token ------
            case IJwtUserIdentity u:
                if (!string.IsNullOrWhiteSpace(u.Email))
                    yield return new Claim(ClaimTypes.Email, u.Email);

                if (!string.IsNullOrWhiteSpace(u.UserName))
                    yield return new Claim(ClaimTypes.Name, u.UserName);

                if (!string.IsNullOrWhiteSpace(u.DisplayName))
                    yield return new Claim("display_name", u.DisplayName);

                if (!string.IsNullOrWhiteSpace(u.FirstName))
                    yield return new Claim("first_name", u.FirstName);

                if (!string.IsNullOrWhiteSpace(u.LastName))
                    yield return new Claim("last_name", u.LastName);
                break;

            // ------ Service token ------
            case IJwtServiceIdentity s:
                yield return new Claim("client_id", s.ServiceName);
                foreach (var scope in s.Scopes ?? Array.Empty<string>())
                    yield return new Claim("scope", scope);
                break;
        }
    }

    /// <summary>
    /// Extracts the user Id (Guid) from a JWT, validating signature/audience/issuer but skipping lifetime.
    /// </summary>
    public static Guid? GetUserIdFromToken(this string jwtToken, IConfiguration config)
    {
        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                                         Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
            ValidateLifetime = false
        };

        try
        {
            var principal = handler.ValidateToken(jwtToken, parameters, out _);
            var claim = principal.FindFirst(ClaimTypes.NameIdentifier);
            return claim is not null ? Guid.Parse(claim.Value) : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Convenience extension – returns the current <c>NameIdentifier</c> claim as <see cref="Guid"/>,
    /// or <c>null</c> if the claim is missing or not a GUID.
    /// </summary>
    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    /// <summary>
    /// Checks if the JWT is valid (signature, audience, issuer, lifetime).
    /// </summary>
    public static bool IsTokenValid(this string jwtToken, IConfiguration config)
    {
        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                                         Encoding.UTF8.GetBytes(config["Jwt:Key"]!))
        };

        try
        {
            handler.ValidateToken(jwtToken, parameters, out _);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Returns true if the JWT is expired (UTC).
    /// </summary>
    public static bool IsExpired(this string jwtToken)
    {
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(jwtToken))
            return true;

        var token = handler.ReadJwtToken(jwtToken);
        return token.ValidTo < DateTime.UtcNow;
    }

    /// <summary>
    /// Fetches a single claim by type from a raw JWT string.
    /// </summary>
    public static string? GetClaim(this string jwtToken, string claimType)
    {
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(jwtToken);
        return token.Claims.FirstOrDefault(c => c.Type == claimType)?.Value;
    }
}
