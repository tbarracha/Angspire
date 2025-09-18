using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace SpireCore.Services;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assemblies = AppDomain.CurrentDomain.GetAssemblies();

        // 1. Use Scrutor to register marker-based interfaces (simplest & fastest for most types)
        services.Scan(scan => scan
            .FromApplicationDependencies()
            .AddClasses(c => c.AssignableTo<ITransientService>())
                .AsSelf()
                .AsImplementedInterfaces()
                .WithTransientLifetime()
            .AddClasses(c => c.AssignableTo<IScopedService>())
                .AsSelf()
                .AsImplementedInterfaces()
                .WithScopedLifetime()
            .AddClasses(c => c.AssignableTo<ISingletonService>())
                .AsSelf()
                .AsImplementedInterfaces()
                .WithSingletonLifetime()
        );

        // 2. Also ensure all subclasses of those marker interfaces get registered
        var baseMarkers = new[] {
            typeof(ITransientService),
            typeof(IScopedService),
            typeof(ISingletonService)
        };

        foreach (var assembly in assemblies)
        {
            foreach (var baseType in baseMarkers)
            {
                RegisterImplementationsOf(services, baseType, assembly);
            }
        }

        return services;
    }

    private static void RegisterImplementationsOf(IServiceCollection services, Type markerInterface, Assembly assembly)
    {
        var types = SafeGetTypes(assembly)
            .Where(t =>
                t is { IsAbstract: false, IsInterface: false, IsClass: true } &&
                ImplementsOrDerivesFrom(t, markerInterface));

        foreach (var impl in types)
        {
            var lifetime = markerInterface switch
            {
                _ when markerInterface == typeof(ITransientService) => ServiceLifetime.Transient,
                _ when markerInterface == typeof(IScopedService) => ServiceLifetime.Scoped,
                _ when markerInterface == typeof(ISingletonService) => ServiceLifetime.Singleton,
                _ => ServiceLifetime.Scoped
            };

            services.Add(new ServiceDescriptor(impl, impl, lifetime));

            // Register interfaces implemented by the class
            foreach (var iface in impl.GetInterfaces()
                         .Where(i => i != markerInterface && markerInterface.IsAssignableFrom(i)))
            {
                services.Add(new ServiceDescriptor(iface, impl, lifetime));
            }

            // Register any concrete base classes (e.g. closed generic abstract bases)
            var baseTypes = GetConcreteBases(impl);
            foreach (var baseType in baseTypes)
            {
                // Avoid registering object or impl itself
                if (baseType != typeof(object) && baseType != impl)
                {
                    services.Add(new ServiceDescriptor(baseType, impl, lifetime));
                }
            }

            // Optionally register marker itself
            if (markerInterface.IsAssignableFrom(impl))
                services.Add(new ServiceDescriptor(markerInterface, impl, lifetime));
        }
    }

    private static IEnumerable<Type> GetConcreteBases(Type type)
    {
        var current = type.BaseType;
        while (current != null && current != typeof(object))
        {
            yield return current;
            current = current.BaseType;
        }
    }

    private static IEnumerable<Type> SafeGetTypes(Assembly assembly)
    {
        try { return assembly.GetTypes(); }
        catch (ReflectionTypeLoadException ex) { return ex.Types.Where(t => t != null)!; }
    }

    private static bool ImplementsOrDerivesFrom(Type type, Type marker)
    {
        return type.GetInterfaces().Any(i =>
            i == marker ||
            (i.IsGenericType && i.GetGenericTypeDefinition() == marker)) ||
            (type.BaseType != null && ImplementsOrDerivesFrom(type.BaseType, marker));
    }
}

