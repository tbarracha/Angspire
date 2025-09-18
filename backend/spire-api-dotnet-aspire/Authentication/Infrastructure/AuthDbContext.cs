using Authentication.Domain.AllowedIpAddresses;
using Authentication.Domain.AuthAudits;
using Authentication.Domain.AuthUserIdentities;
using Authentication.Domain.RefreshTokens;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SpireCore.API.DbProviders.EntityFramework.DbContexts;
using SpireCore.Utils;

namespace Authentication.Infrastructure;

public class AuthDbContext : IdentityDbContext<AuthUserIdentity, IdentityRole<Guid>, Guid>
{
    public AuthDbContext(DbContextOptions options) : base(options)
    {
    }

    // === Identity Core ===
    public new DbSet<AuthUserIdentity> Users => Set<AuthUserIdentity>();
    public DbSet<AuthAudit> AuthAudits => Set<AuthAudit>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AllowedIpAddress> AllowedIpAddresses => Set<AllowedIpAddress>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.ConfigureEnumStorageAsString();
        base.ConfigureConventions(configurationBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
        modelBuilder.ApplyIEntityConfiguration();
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            foreach (var prop in entry.Properties)
            {
                var type = prop.Metadata.ClrType;
                // handle DateTime and Nullable<DateTime>
                if (type == typeof(DateTime) || Nullable.GetUnderlyingType(type) == typeof(DateTime))
                {
                    if (prop.CurrentValue is DateTime dt)
                        prop.CurrentValue = DateUtils.EnsureUtc(dt);
                }
            }
        }

        return base.SaveChangesAsync(ct);
    }
}