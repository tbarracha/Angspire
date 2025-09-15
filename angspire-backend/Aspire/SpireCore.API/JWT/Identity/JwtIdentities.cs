
namespace SpireCore.API.JWT.Identity;

/// <summary>
/// Concrete JWT identity for human users.
/// </summary>
public class JwtUserIdentity : IJwtUserIdentity
{
    public Guid Id { get; set; }
    public string Issuer { get; set; } = default!;
    public IReadOnlyDictionary<string, object> RawClaims { get; set; } = default!;
    public bool IsService => false;

    public string? Email { get; set; }
    public string? UserName { get; set; }
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ImageUrl { get; set; } = null;
}

/// <summary>
/// Concrete JWT identity for machine‐to‐machine clients.
/// </summary>
public class JwtServiceIdentity : IJwtServiceIdentity
{
    public Guid Id { get; set; }
    public string Issuer { get; set; } = default!;
    public IReadOnlyDictionary<string, object> RawClaims { get; set; } = default!;
    public bool IsService => true;

    public string ServiceName { get; set; } = default!;
    public string? ImageUrl { get; set; } = null;

    public IReadOnlyCollection<string> Scopes { get; set; } = Array.Empty<string>();
}