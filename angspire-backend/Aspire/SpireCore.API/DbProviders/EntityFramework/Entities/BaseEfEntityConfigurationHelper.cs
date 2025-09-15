using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpireCore.Abstractions.Interfaces;
using SpireCore.API.Contracts.Entities;

namespace SpireCore.API.DbProviders.EntityFramework.Entities;

/// <summary>
/// Provides helper methods for configuring common entity properties and composite entity types for EF Core.
/// </summary>
public static class BaseEfEntityConfigurationHelper
{

    // === Simple Properties ===

    /// <summary>
    /// Configures the primary key for an entity implementing <see cref="IHasId{TId}"/>.
    /// </summary>
    public static void ConfigureHasId<T, TId>(EntityTypeBuilder<T> builder)
        where T : class, IHasId<TId>
    {
        builder.HasKey(nameof(IHasId<TId>.Id));
    }

    /// <summary>
    /// Configures the primary key for an entity implementing <see cref="IHasId{Guid}"/>.
    /// Shortcut for entities with <see cref="Guid"/> as their identifier.
    /// </summary>
    public static void ConfigureHasId<T>(EntityTypeBuilder<T> builder)
        where T : class, IHasId<Guid>
    {
        builder.HasKey(nameof(IHasId<Guid>.Id));
    }

    /// <summary>
    /// Configures the <c>CreatedAt</c> property as required for an entity implementing <see cref="ICreatedAt"/>.
    /// </summary>
    public static void ConfigureCreatedAt<T>(EntityTypeBuilder<T> builder)
        where T : class, ICreatedAt
    {
        builder.Property(nameof(ICreatedAt.CreatedAt)).IsRequired();
    }

    /// <summary>
    /// Configures the <c>UpdatedAt</c> property as required for an entity implementing <see cref="IUpdatedAt"/>.
    /// </summary>
    public static void ConfigureUpdatedAt<T>(EntityTypeBuilder<T> builder)
        where T : class, IUpdatedAt
    {
        builder.Property(nameof(IUpdatedAt.UpdatedAt)).IsRequired();
    }

    /// <summary>
    /// Configures the <c>StateFlag</c> property as required with a maximum length, for an entity implementing <see cref="IStateFlag"/>.
    /// </summary>
    /// <param name="maxLength">The maximum length for the StateFlag property. Default is 1.</param>
    public static void ConfigureStateFlag<T>(EntityTypeBuilder<T> builder, int maxLength = 1)
        where T : class, IStateFlag
    {
        builder.Property(nameof(IStateFlag.StateFlag)).IsRequired().HasMaxLength(maxLength);
    }

    /// <summary>
    /// Configures the <c>CreatedBy</c> property with a maximum length and index, for an entity implementing <see cref="ICreatedBy"/>.
    /// </summary>
    /// <param name="maxLength">The maximum length for the CreatedBy property. Default is 100.</param>
    public static void ConfigureCreatedBy<T>(EntityTypeBuilder<T> builder, int maxLength = 100)
        where T : class, ICreatedBy
    {
        builder.Property(nameof(ICreatedBy.CreatedBy)).HasMaxLength(maxLength);
        builder.HasIndex(nameof(ICreatedBy.CreatedBy));
    }

    /// <summary>
    /// Configures the <c>UpdatedBy</c> property with a maximum length and index, for an entity implementing <see cref="IUpdatedBy"/>.
    /// </summary>
    /// <param name="maxLength">The maximum length for the UpdatedBy property. Default is 100.</param>
    public static void ConfigureUpdatedBy<T>(EntityTypeBuilder<T> builder, int maxLength = 100)
        where T : class, IUpdatedBy
    {
        builder.Property(nameof(IUpdatedBy.UpdatedBy)).HasMaxLength(maxLength);
        builder.HasIndex(nameof(IUpdatedBy.UpdatedBy));
    }



    // === Composite Configurations for Your Domain Interfaces ===

    /// <summary>
    /// Configures common properties for an entity implementing <see cref="Contracts.Entities.IEFEntity{TId}"/>:
    /// Id, CreatedAt, UpdatedAt, and StateFlag.
    /// </summary>
    public static void ConfigureEntity<T, TId>(EntityTypeBuilder<T> builder)
        where T : class, IEfEntity<TId>
    {
        ConfigureHasId<T, TId>(builder);
        ConfigureCreatedAt(builder);
        ConfigureUpdatedAt(builder);
        ConfigureStateFlag(builder);
    }

    /// <summary>
    /// Configures common properties for an entity implementing <see cref="Contracts.Entities.IEFEntity{Guid}"/>.
    /// Shortcut for entities with Guid keys.
    /// </summary>
    public static void ConfigureEntity<T>(EntityTypeBuilder<T> builder)
        where T : class, IEfEntity<Guid>
    {
        ConfigureEntity<T, Guid>(builder);
    }

    /// <summary>
    /// Configures all common properties for an auditable entity implementing <see cref="IAuditableEntity{TId}"/>:
    /// Id, CreatedAt, UpdatedAt, StateFlag, CreatedBy, and UpdatedBy.
    /// </summary>
    public static void ConfigureAuditableEntity<T, TId>(EntityTypeBuilder<T> builder)
        where T : class, IEfEntity<TId>, IAuditableEntity<TId>
    {
        ConfigureEntity<T, TId>(builder);
        ConfigureCreatedBy(builder);
        ConfigureUpdatedBy(builder);
    }

    /// <summary>
    /// Configures all common properties for an auditable entity implementing <see cref="IAuditableEntity{Guid}"/>.
    /// Shortcut for auditable entities with Guid keys.
    /// </summary>
    public static void ConfigureAuditableEntity<T>(EntityTypeBuilder<T> builder)
        where T : class, IEfEntity<Guid>, IAuditableEntity<Guid>
    {
        ConfigureAuditableEntity<T, Guid>(builder);
    }
}

