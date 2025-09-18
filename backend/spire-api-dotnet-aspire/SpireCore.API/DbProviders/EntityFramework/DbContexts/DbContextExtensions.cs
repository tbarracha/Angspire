using Microsoft.EntityFrameworkCore;
using SpireCore.API.DbProviders.EntityFramework.Entities;
using System.Reflection;

namespace SpireCore.API.DbProviders.EntityFramework.DbContexts;

public static class DbContextExtensions
{
    /// <summary>
    /// Configure all enums to be stored as strings for this context.
    /// Call this from ConfigureConventions.
    /// </summary>
    public static void ConfigureEnumStorageAsString(this ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<Enum>().HaveConversion<string>();
    }

    /// <summary>
    /// Calls ConfigureEntity for all IEntity<> implementations in the model.
    /// </summary>
    public static void ApplyIEntityConfiguration(this ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            // only deal with *closed* types
            if (clrType.IsAbstract || clrType.ContainsGenericParameters)
                continue;

            var ientityInterface = clrType
                .GetInterfaces()
                .FirstOrDefault(i =>
                    i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEfEntity<>));

            if (ientityInterface == null)
                continue;

            var methodInfo = clrType.GetMethod(
                "ConfigureEntity",
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.FlattenHierarchy);

            if (methodInfo == null || methodInfo.ContainsGenericParameters)
                continue;

            var entityBuilder = modelBuilder.Entity(clrType);
            var entityInstance = Activator.CreateInstance(clrType)!;
            methodInfo.Invoke(entityInstance, new object[] { entityBuilder });
        }
    }
}

