using Genspire.Application.Modules.Authentication.Domain.AllowedIps;
using Genspire.Application.Modules.Authentication.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SpireCore.API.DbProviders.EntityFramework.Repositories;
using SpireCore.Constants;
using SpireCore.Services;
using System.Net;

namespace Genspire.Application.Modules.Authentication.Domain.AllowedIpAddresses;
public class AllowedIpAddressRepository : EfEntityRepository<AllowedIpAddress, Guid, BaseAuthDbContext>, ITransientService
{
    public AllowedIpAddressRepository(BaseAuthDbContext ctx) : base(ctx)
    {
    }

    /// <summary>
    /// True if the exact IP address is whitelisted and ACTIVE.
    /// </summary>
    public async Task<bool> IsAllowedAsync(string ip)
    {
        return await _dbSet.AnyAsync(a => a.IpAddress == ip && a.StateFlag == StateFlags.ACTIVE);
    }

    /// <summary>
    /// Add a new IP address (duplicate-safe) and save immediately.
    /// </summary>
    public async Task AddAsync(string ip, string? comment = null)
    {
        if (await IsAllowedAsync(ip))
            return;
        // validate IP format
        if (!IPAddress.TryParse(ip, out _))
            throw new ArgumentException("Invalid IP address format.", nameof(ip));
        await _dbSet.AddAsync(new AllowedIpAddress { IpAddress = ip, Comment = comment, StateFlag = StateFlags.ACTIVE });
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Remove (soft-delete) an IP address.
    /// </summary>
    public async Task RemoveAsync(string ip)
    {
        var entity = await _dbSet.FirstOrDefaultAsync(a => a.IpAddress == ip);
        if (entity == null)
            return;
        entity.StateFlag = StateFlags.DELETED;
        _context.Update(entity);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// List all active allowed IPs.
    /// </summary>
    public async Task<IReadOnlyList<AllowedIpAddress>> ListAllAsync() => await _dbSet.Where(a => a.StateFlag == StateFlags.ACTIVE).OrderBy(a => a.IpAddress).ToListAsync();
}