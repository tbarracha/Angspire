using SpireCore.Abstractions.Interfaces;

namespace SpireCore.API.JWT.Identity;

/// <summary>
/// Base JWT identity, common to both users and services.
/// </summary>
public interface IJwtIdentity : IHasId<Guid>
{
    /// <summary>
    /// The token issuer (“iss”)
    /// </summary>
    string Issuer { get; }

    /// <summary>
    /// Raw claims, in case you need something custom
    /// </summary>
    IReadOnlyDictionary<string, object> RawClaims { get; }

    /// <summary>
    /// True if this identity represents a service/client rather than a human user
    /// </summary>
    bool IsService { get; }

    /// <summary>
    /// Optional image/avatar URL for this identity (user or service).
    /// </summary>
    string? ImageUrl { get; }
}

/// <summary>
/// Adds user-specific fields
/// </summary>
public interface IJwtUserIdentity : IJwtIdentity
{
    string? Email { get; }
    string? UserName { get; }
    string? DisplayName { get; }
    string? FirstName { get; }
    string? LastName { get; }
}

/// <summary>
/// Adds machine-client fields
/// </summary>
public interface IJwtServiceIdentity : IJwtIdentity
{
    /// <summary>
    /// Client-id or logical service name
    /// </summary>
    string ServiceName { get; }
    /// <summary>
    /// OAuth scopes or roles granted
    /// </summary>
    IReadOnlyCollection<string> Scopes { get; }
}
