using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Shared.Database;

public static class DbSettingsExtensions
{
    public static IDbSettingsService AddDbSettings(this IServiceCollection services, IConfiguration config)
    {
        EnsureDirectory(Path.Combine(AppContext.BaseDirectory, "data"));

        var svc = new DbSettingsService(config);
        services.AddSingleton<IDbSettingsService>(svc);

        var fileStorage = svc.Profile.FileStorage;
        if (fileStorage != null && fileStorage.Provider.Equals("Local", StringComparison.OrdinalIgnoreCase))
        {
            var rootPath = string.IsNullOrWhiteSpace(fileStorage.RootPath) ? "./files" : fileStorage.RootPath;
            EnsureDirectory(ToAbsolutePath(rootPath)); // handles "./local"
        }

        return svc;
    }

    private static void EnsureDirectory(string path)
    {
        if (!Directory.Exists(path))
            Directory.CreateDirectory(path);
    }

    private static string ToAbsolutePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return Path.Combine(AppContext.BaseDirectory, "files");
        return Path.IsPathRooted(path) ? path : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, path));
    }
}
