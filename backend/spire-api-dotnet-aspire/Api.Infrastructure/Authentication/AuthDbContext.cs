using Genspire.Application.Modules.Authentication.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Genspire.Infrastructure.Authentication;

public class AuthDbContext : BaseAuthDbContext
{
    public AuthDbContext(DbContextOptions options) : base(options) { }
}

