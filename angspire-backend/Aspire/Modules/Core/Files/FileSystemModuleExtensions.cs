// File: App.Core.Files/FileSystemModuleExtensions.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpireCore.Files.Storage;

namespace App.Core.Files;

public static class FileSystemModuleExtensions
{
    /// <summary>
    /// Registers file storage + exports a canonical FILE_UPLOAD_PATH env var
    /// based on the active DbSettings profile.
    /// </summary>
    public static IServiceCollection AddFileSystem(this IServiceCollection services, IConfiguration cfg)
    {
        // 1) Resolve active profile: ENV DB_PROFILE > DbSettings:Profile > "hostdev"
        var activeProfile = Environment.GetEnvironmentVariable("DB_PROFILE")
                           ?? cfg["DbSettings:Profile"]
                           ?? "hostdev";

        // 2) Bind FileStorage options from the active profile
        var fsSectionPath = $"DbSettings:Profiles:{activeProfile}:FileStorage";
        var fsSection = cfg.GetSection(fsSectionPath);

        var provider = fsSection["Provider"] ?? "Local";

        // Make provider visible to the rest of the app
        Environment.SetEnvironmentVariable("FILE_STORAGE_PROVIDER", provider);

        // 3) Normalize & export a canonical FILE_UPLOAD_PATH per provider
        //    - Local  => absolute directory path
        //    - S3-like => public/base URL (BaseUrl) or inferred AWS URL if not present
        if (provider.Equals("Local", StringComparison.OrdinalIgnoreCase))
        {
            var rootPath = fsSection["RootPath"] ?? "./files";

            // Resolve to absolute path relative to the application base directory
            var baseDir = AppContext.BaseDirectory;
            var absolute = Path.GetFullPath(Path.IsPathRooted(rootPath) ? rootPath : Path.Combine(baseDir, rootPath));

            // Ensure directory exists
            Directory.CreateDirectory(absolute);

            // Export env vars for other layers
            Environment.SetEnvironmentVariable("FILE_UPLOAD_PATH", absolute);
            Environment.SetEnvironmentVariable("FILE_STORAGE_ROOT_PATH", absolute);

            // Register Local provider
            services.AddSingleton<IFileStorageService>(_ =>
                new LocalFileStorageService(new LocalFileStorageOptions
                {
                    RootPath = absolute,
                    AckEveryBytes = 4 * 1024 * 1024,
                    UseSidecarMetadata = true
                })
            );
        }
        else if (provider.Equals("S3", StringComparison.OrdinalIgnoreCase))
        {
            var bucket = fsSection["Bucket"] ?? "genspire-files";
            var region = fsSection["Region"] ?? "eu-west-1";
            var baseUrl = fsSection["BaseUrl"];

            // Prefer configured BaseUrl; otherwise infer standard AWS style
            // (MinIO / custom gateways should always set BaseUrl)
            var canonicalUrl = !string.IsNullOrWhiteSpace(baseUrl)
                ? baseUrl.TrimEnd('/')
                : $"https://s3.{region}.amazonaws.com/{bucket}";

            // Export env vars for consumers (frontends, other services, etc.)
            Environment.SetEnvironmentVariable("FILE_UPLOAD_PATH", canonicalUrl);
            Environment.SetEnvironmentVariable("FILE_STORAGE_BUCKET", bucket);
            Environment.SetEnvironmentVariable("FILE_STORAGE_REGION", region);

            // You may also export MinIO/AWS SDK specifics if present (optional)
            var serviceUrl = fsSection.GetSection("S3")["ServiceUrl"];
            var accessKey = fsSection.GetSection("S3")["AccessKey"];
            var secretKey = fsSection.GetSection("S3")["SecretKey"];
            var forcePath = fsSection.GetSection("S3")["ForcePathStyle"];

            if (!string.IsNullOrWhiteSpace(serviceUrl))
                Environment.SetEnvironmentVariable("FILE_STORAGE_SERVICE_URL", serviceUrl);
            if (!string.IsNullOrWhiteSpace(accessKey))
                Environment.SetEnvironmentVariable("FILE_STORAGE_ACCESS_KEY", accessKey);
            if (!string.IsNullOrWhiteSpace(secretKey))
                Environment.SetEnvironmentVariable("FILE_STORAGE_SECRET_KEY", secretKey);
            if (!string.IsNullOrWhiteSpace(forcePath))
                Environment.SetEnvironmentVariable("FILE_STORAGE_FORCE_PATH_STYLE", forcePath);

            // NOTE:
            // S3 provider wiring is not included in your snippet. If/when you add an S3 implementation
            // of IFileStorageService, register it here similar to Local.
        }
        else
        {
            // Fallback: just export whatever we can
            Environment.SetEnvironmentVariable("FILE_UPLOAD_PATH", fsSection["BaseUrl"] ?? fsSection["RootPath"] ?? "./files");
        }

        // 4) Factory + gateway (routing still works with a single provider)
        services.AddSingleton<FileStorageRoutingOptions>(_ => new FileStorageRoutingOptions
        {
            DefaultProvider = provider
        });

        services.AddSingleton<IFileStorageFactory, FileStorageFactory>();
        services.AddScoped<FileGateway>();

        return services;
    }
}
