// Authentication/AuthModuleExtensions.cs
using Authentication.Domain.AuthUserIdentities;
using Authentication.Domain.Services;
using Authentication.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Shared.Database;

namespace Authentication;

public static class AuthenticationExtensions
{
    /// <summary>
    /// Registers AuthDbContext + Identity and adds a hosted migrator that:
    /// 1) Ensures the database exists (PostgreSQL),
    /// 2) Applies EF migrations,
    /// 3) Seeds SuperAdmin + Allowed IPs.
    /// </summary>
    public static IServiceCollection AddAuthentication(this IServiceCollection services, IDbSettingsService storage)
    {
        var auth = storage.Profile.Auth;

        services.AddDbContext<AuthDbContext>(opts =>
        {
            switch (auth.Provider)
            {
                case DbProvider.Sqlite: opts.UseSqlite(auth.ConnectionString); break;
                case DbProvider.PostgreSQL: opts.UseNpgsql(auth.ConnectionString); break;
                default: throw new InvalidOperationException($"Unsupported Auth provider: {auth.Provider}");
            }
        });

        services
            .AddIdentity<AuthUserIdentity, IdentityRole<Guid>>(options => { /* password/lockout if needed */ })
            .AddEntityFrameworkStores<AuthDbContext>()
            .AddDefaultTokenProviders();

        // Make sure the service itself can be resolved by the bootstrapper and the app.
        services.AddTransient<AuthenticationService>();
        services.AddTransient<IAuthIdentityService, AuthenticationService>();

        // Ensure DB exists + run migrations + seed
        services.AddHostedService<AuthDbBootstrapper>();

        return services;
    }
}

internal sealed class AuthDbBootstrapper : IHostedService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<AuthDbBootstrapper> _logger;
    private readonly IDbSettingsService _dbSettings;

    public AuthDbBootstrapper(IServiceProvider sp, ILogger<AuthDbBootstrapper> logger, IDbSettingsService dbSettings)
    {
        _sp = sp;
        _logger = logger;
        _dbSettings = dbSettings;
    }

    public async Task StartAsync(CancellationToken ct)
    {
        var auth = _dbSettings.Profile.Auth;

        // 1) Ensure database exists (PostgreSQL)
        if (auth.Provider == DbProvider.PostgreSQL && !string.IsNullOrWhiteSpace(auth.ConnectionString))
        {
            try { await EnsurePostgresDatabaseAsync(auth.ConnectionString!, ct); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to ensure PostgreSQL database exists."); throw; }
        }

        // 2) Apply EF migrations
        try
        {
            using var scope = _sp.CreateScope();
            var ctx = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
            _logger.LogInformation("Applying AuthDbContext migrations…");
            await ctx.Database.MigrateAsync(ct);
            _logger.LogInformation("AuthDbContext migrated.");

            // 3) Seed after migrations
            var authSvc = scope.ServiceProvider.GetRequiredService<AuthenticationService>();
            await authSvc.EnsureSuperAdminAsync();
            await authSvc.EnsureAllowedIpsAsync();
            _logger.LogInformation("Auth seed completed.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed during AuthDb migration/seed.");
            throw;
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

    private static async Task EnsurePostgresDatabaseAsync(string cs, CancellationToken ct)
    {
        var builder = new Npgsql.NpgsqlConnectionStringBuilder(cs);
        var targetDb = builder.Database;
        if (string.IsNullOrWhiteSpace(targetDb))
            throw new InvalidOperationException("Auth PostgreSQL connection string has no Database.");

        var serverCs = new Npgsql.NpgsqlConnectionStringBuilder(builder.ConnectionString) { Database = "postgres" }.ConnectionString;

        await using var conn = new Npgsql.NpgsqlConnection(serverCs);
        await conn.OpenAsync(ct);

        const string existsSql = "SELECT 1 FROM pg_database WHERE datname = @dbname;";
        await using (var cmd = new Npgsql.NpgsqlCommand(existsSql, conn))
        {
            cmd.Parameters.AddWithValue("dbname", targetDb);
            var exists = await cmd.ExecuteScalarAsync(ct) is 1;
            if (exists) return;
        }

        var safeDb = "\"" + targetDb.Replace("\"", "\"\"") + "\"";
        await using (var cmd = new Npgsql.NpgsqlCommand($"CREATE DATABASE {safeDb};", conn))
        {
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }
}
