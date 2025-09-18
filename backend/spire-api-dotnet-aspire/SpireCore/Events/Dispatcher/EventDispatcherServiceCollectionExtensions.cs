using Microsoft.Extensions.DependencyInjection;

namespace SpireCore.Events.Dispatcher;

public static class EventDispatcherServiceCollectionExtensions
{
    public static IServiceCollection AddDomainEventDispatcher(this IServiceCollection services)
    {
        services.AddScoped<IEventDispatcher, InMemoryEventDispatcher>();

        // Use Scrutor to register all IEventHandler<> implementations
        services.Scan(scan => scan
            .FromApplicationDependencies()
            .AddClasses(classes => classes.AssignableTo(typeof(IEventHandler<>)))
            .AsImplementedInterfaces()
            .WithTransientLifetime()
        );

        return services;
    }
}

