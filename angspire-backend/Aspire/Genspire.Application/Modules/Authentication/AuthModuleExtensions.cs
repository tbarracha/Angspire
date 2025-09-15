using Genspire.Application.Modules.Authentication.Domain.AuthUserIdentities;
using Genspire.Application.Modules.Authentication.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Genspire.Application.Modules.Authentication;
public static class AuthModuleExtensions
{
    /// <summary>
    /// Registers only domain authentication services (repositories, interfaces, custom logic).
    /// </summary>
    public static IServiceCollection AddAuthModuleServices(this IServiceCollection services)
    {
        // Identity registration (always added)
        services.AddIdentity<AuthUserIdentity, IdentityRole<Guid>>().AddEntityFrameworkStores<BaseAuthDbContext>().AddDefaultTokenProviders();
        return services;
    }
}