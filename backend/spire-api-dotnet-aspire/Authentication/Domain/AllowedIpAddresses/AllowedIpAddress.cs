using Authentication.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Authentication.Domain.AllowedIpAddresses;
/// <summary>
/// A single IPv4/IPv6 address that is authorised to call the Auth API.
/// </summary>
public class AllowedIpAddress : BaseAuthEntity
{
    /// <summary>Canonical string form of the IP address (no CIDR).</summary>
    public string IpAddress { get; set; } = default!;
    /// <summary>Optional comment (who added it / why).</summary>
    public string? Comment { get; set; }

    // --------------------------------------------------------------------
    // Fluent-API mapping
    // --------------------------------------------------------------------
    public override void ConfigureEntity<T>(EntityTypeBuilder<T> builder)
    {
        base.ConfigureEntity(builder);
        if (builder is not EntityTypeBuilder<AllowedIpAddress> b)
            return;
        b.ToTable("AllowedIpAddresses");
        b.Property(a => a.IpAddress).IsRequired().HasMaxLength(64);
        b.HasIndex(a => a.IpAddress).IsUnique();
        b.Property(a => a.Comment).HasMaxLength(256);
    }
}