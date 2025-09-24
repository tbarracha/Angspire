using Seeding.Seeders.Identity.Groups;
using Seeding.Seeders.Identity.Tags;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Seeding;

public static class StartupSeeder
{
    /// <summary>
    /// High-level options to control what gets seeded.
    /// </summary>
    public sealed class SeedOptions
    {
        public bool OverwriteExisting { get; set; } = false;

        // toggles
        public bool SeedGroupDefaults { get; set; } = true;
        public bool EnsureUsersHaveDefaultTeam { get; set; } = true;
        public bool SeedTags { get; set; } = true;
    }

    /// <summary>
    /// Call this after registering all services & repositories.
    /// Typically invoked at the end of Program.cs after building the app:
    /// await app.Services.SeedAsync(opts => { opts.OverwriteExisting = true; });
    /// </summary>
    public static async Task SeedAsync(this IServiceProvider services, Action<SeedOptions>? configure = null)
    {
        var opts = new SeedOptions();
        configure?.Invoke(opts);

        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("BusinessSeeder");

        logger.LogInformation("==== BusinessSeeder START ====");

        if (opts.SeedGroupDefaults || opts.EnsureUsersHaveDefaultTeam)
        {
            var (typesSeeded, typesUpdated, rolesSeeded, rolesUpdated) =
                await GroupSeeder.SeedDefaultsAsync(sp, opts.OverwriteExisting, logger);

            logger.LogInformation(
                "GroupDefaults: Types +{TypesSeeded}/~{TypesUpdated}, Roles +{RolesSeeded}/~{RolesUpdated}",
                typesSeeded, typesUpdated, rolesSeeded, rolesUpdated);

            if (opts.EnsureUsersHaveDefaultTeam)
            {
                var (created, failed) = await GroupSeeder.EnsureUsersHaveDefaultTeamAsync(sp, logger);
                logger.LogInformation("EnsureUsersHaveDefaultTeam: Created {Created}, Failed {Failed}", created, failed);
            }
        }

        if (opts.SeedTags)
        {
            var (categoriesSeeded, tagsSeeded) =
                await TagSeeder.SeedAsync(sp, opts.OverwriteExisting, logger);

            logger.LogInformation("Tags: Categories +{Categories}, Tags +{Tags}", categoriesSeeded, tagsSeeded);
        }

        logger.LogInformation("==== BusinessSeeder END ====");
    }
}
