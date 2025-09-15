using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpireCore.API.Contracts.Entities;
using SpireCore.API.DbProviders.EntityFramework.Entities;
using SpireCore.API.JWT.Identity;
using SpireCore.Constants;
using System.ComponentModel.DataAnnotations.Schema;

namespace Genspire.Application.Modules.Authentication.Domain.AuthUserIdentities;
/// <summary>
/// User or service principal persisted in the Auth module.
/// Implements <see cref = "IJwtIdentity"/> for token generation
/// and <see cref = "IEfEntity{TKey}"/> so it owns its own EF mapping.
/// </summary>
public class AuthUserIdentity : IdentityUser<Guid>, IEntity<Guid>, IEfEntity<Guid>, IJwtIdentity
{
    // -------------- identity-provider data --------------
    public string Provider { get; set; } = "local";
    public string? ProviderUserId { get; set; }
    /// <summary>True if this principal is a service / machine user.</summary>
    public bool IsService { get; set; }
    // --------------- personal profile fields ---------------
    public string? DisplayName { get; set; } = string.Empty;
    public string? FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? ImageUrl { get; set; } = null;
    // --------------- audit / state ---------------
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string StateFlag { get; set; } = StateFlags.ACTIVE;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? LastLogoutAt { get; set; }
    public DateTime? LastPasswordChangeAt { get; set; }
    public DateTime? LastFailedLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public string? LastLoginUserAgent { get; set; }
    public bool IsInitialPasswordChanged { get; set; }
    // --------------- IJwtIdentity ---------------
    /// <inheritdoc/>
    public string Issuer { get; set; } = string.Empty;

    /// <inheritdoc/>
    [NotMapped]
    public IReadOnlyDictionary<string, object> RawClaims { get; set; } = new Dictionary<string, object>();

    // --------------- IEfEntity mapping ---------------
    /// <summary>
    /// Configures the EF Core model for <see cref = "AuthUserIdentity"/>.
    /// Remains inside the entity (vertical-slice style) but is now <b>public</b>
    /// so reflection can discover and invoke it.
    /// </summary>
    void IEfEntity<Guid>.ConfigureEntity<T>(EntityTypeBuilder<T> builder)
    {
        if (builder is not EntityTypeBuilder<AuthUserIdentity> b)
            return;
        b.ToTable("AuthUserIdentities");
        // Provider & external-id
        b.Property(u => u.Provider).IsRequired().HasMaxLength(32);
        b.Property(u => u.ProviderUserId).HasMaxLength(128);
        // Profile
        b.Property(u => u.DisplayName).HasMaxLength(150);
        b.Property(u => u.FirstName).HasMaxLength(100);
        b.Property(u => u.LastName).HasMaxLength(100);
        b.Property(u => u.DateOfBirth);
        b.Property(u => u.ImageUrl).HasMaxLength(300);
        // Audit
        b.Property(u => u.CreatedAt).IsRequired();
        b.Property(u => u.UpdatedAt).IsRequired();
        b.Property(u => u.StateFlag).IsRequired().HasMaxLength(1);
        // Login metadata
        b.Property(u => u.LastLoginAt);
        b.Property(u => u.LastLogoutAt);
        b.Property(u => u.LastPasswordChangeAt);
        b.Property(u => u.LastFailedLoginAt);
        b.Property(u => u.LastLoginIp).HasMaxLength(64);
        b.Property(u => u.LastLoginUserAgent).HasMaxLength(256);
        // Flags
        b.Property(u => u.IsService).IsRequired();
        b.Property(u => u.IsInitialPasswordChanged).IsRequired().HasDefaultValue(false);
        // Never persist the raw-claim bag
        b.Ignore(u => u.RawClaims);
    }
}