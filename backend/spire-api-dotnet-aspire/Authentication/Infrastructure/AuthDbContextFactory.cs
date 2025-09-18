// Authentication.Infrastructure/AuthDbContextFactory.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Authentication.Infrastructure;

public class AuthDbContextFactory : IDesignTimeDbContextFactory<AuthDbContext>
{
    public AuthDbContext CreateDbContext(string[] args)
    {
        // Load config relative to the startup project's working dir (when using -s)
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        var basePath = Directory.GetCurrentDirectory();

        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{env}.json", optional: true)
            .AddEnvironmentVariables() // allows DB_PROFILE override
            .Build();

        // Resolve active profile (env var wins)
        var profile = Environment.GetEnvironmentVariable("DB_PROFILE")
                   ?? config["DbSettings:Profile"]
                   ?? "hostdev";

        // Read provider & connection string from DbSettings:Profiles:<profile>:Auth
        var provider = (config[$"DbSettings:Profiles:{profile}:Auth:Provider"] ?? "PostgreSQL").Trim();
        var connStr = (config[$"DbSettings:Profiles:{profile}:Auth:ConnectionString"]
                     ?? "Host=localhost;Port=5432;Database=genspire_auth;Username=postgres;Password=postgres").Trim();

        var options = new DbContextOptionsBuilder<AuthDbContext>();

        switch (provider.ToLowerInvariant())
        {
            case "postgresql":
            case "npgsql":
                options.UseNpgsql(connStr);
                break;

            case "sqlite":
                options.UseSqlite(connStr);
                break;

            case "sqlserver":
                options.UseSqlServer(connStr);
                break;

            default:
                throw new InvalidOperationException(
                    $"Unsupported AuthDb provider in DbSettings: '{provider}'. " +
                    $"Expected one of: PostgreSQL, Sqlite, SqlServer.");
        }

        return new AuthDbContext(options.Options);
    }
}
