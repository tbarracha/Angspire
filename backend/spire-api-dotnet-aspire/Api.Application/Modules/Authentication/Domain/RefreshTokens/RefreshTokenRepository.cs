using Genspire.Application.Modules.Authentication.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SpireCore.API.DbProviders.EntityFramework.Repositories;
using SpireCore.Constants;
using SpireCore.Services;

namespace Genspire.Application.Modules.Authentication.Domain.RefreshTokens;
public class RefreshTokenRepository : EfEntityRepository<RefreshToken, Guid, BaseAuthDbContext>, ITransientService
{
    public RefreshTokenRepository(BaseAuthDbContext context) : base(context)
    {
    }

    public async Task<RefreshToken?> GetValidTokenAsync(string token)
    {
        return await _dbSet.Include(r => r.AuthUser).FirstOrDefaultAsync(r => r.Token == token && !r.IsRevoked && r.ExpiresAt > DateTime.UtcNow && r.StateFlag == StateFlags.ACTIVE);
    }

    public async Task RevokeTokenAsync(RefreshToken token)
    {
        token.IsRevoked = true;
        token.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(token);
        await _context.SaveChangesAsync();
    }
}