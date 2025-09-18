using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Genspire.Infrastructure.Authentication;

public class AuthDbContextFactory : IDesignTimeDbContextFactory<AuthDbContext>
{
    public AuthDbContext CreateDbContext(string[] args)
    {
        string basePath = Directory.GetCurrentDirectory();
        string jsonPath = "appsettings.json";
        if (!File.Exists(Path.Combine(basePath, jsonPath)))
        {
            basePath = Path.Combine(basePath, "..", "Genspire.Host");
        }

        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.local.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<AuthDbContext>();

        // Get connection string from Modules section
        var connectionString = config.GetSection("Modules:Auth:ConnectionString").Value
            ?? "Host=localhost;Port=5432;Database=spire_auth_db;Username=postgres;Password=postgres";

        optionsBuilder.UseNpgsql(connectionString);

        return new AuthDbContext(optionsBuilder.Options);
    }
}

