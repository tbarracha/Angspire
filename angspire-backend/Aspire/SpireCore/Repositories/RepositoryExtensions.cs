using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SpireCore.Repositories;

public static class RepositoryExtensions
{
    // Ensure all IRepository<> and descendants are registered as Transient
    public static IServiceCollection AddApplicationRepositories(this IServiceCollection services, IConfiguration configuration)
    {
        services.Scan(scan => scan
            .FromApplicationDependencies()
            .AddClasses(c => c
                .Where(t => t.IsClass && !t.IsAbstract &&
                            t.GetInterfaces().Any(i =>
                                i.IsGenericType &&
                                
                                    i.GetGenericTypeDefinition() == typeof(IRepository<>)
                                
                            )
                )
            )
            .AsImplementedInterfaces()
            .WithTransientLifetime()
        );

        return services;
    }
}

