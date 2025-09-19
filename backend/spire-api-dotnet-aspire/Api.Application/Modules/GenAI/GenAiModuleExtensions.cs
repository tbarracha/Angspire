using Microsoft.Extensions.DependencyInjection;

namespace Genspire.Application.Modules.GenAI;
public static class GenAiModuleExtensions
{
    /// <summary>
    /// Registers only domain authentication services (repositories, interfaces, custom logic).
    /// </summary>
    public static IServiceCollection AddGenAiModuleServices(this IServiceCollection services)
    {
        return services;
    }
}