using Genspire.Application.Modules.Authentication;
using Microsoft.Extensions.DependencyInjection;
using SpireCore.API.Configuration.Modules;

namespace Genspire.Application.Modules;
public static class ModulesExtensions
{
    public static void FilterEnabledModules(this IServiceCollection services, ModulesConfigurationList modules)
    {
        if (modules.TryGetValue("Authentication", out var authConfig) && authConfig.Enabled)
        {
            services.AddAuthModuleServices();
        }
    }
}