using SpireCore.Services;

namespace SpireCore.JsonDatabase;

public class JsonDatabaseConfig : ISingletonService
{
    public string BaseDirectory { get; set; } = "Data\\JsonDb";
    public string FileName { get; set; } = "data.json";

    public JsonDatabaseConfig()
    {
        if (!Path.IsPathRooted(BaseDirectory))
        {
            var solutionRoot = FindSolutionRoot();
            if (solutionRoot != null)
            {
                BaseDirectory = Path.GetFullPath(Path.Combine(solutionRoot, BaseDirectory));
            }
            else
            {
                BaseDirectory = Path.GetFullPath(BaseDirectory);
            }
        }

        if (string.IsNullOrWhiteSpace(FileName))
            FileName = "data.json";
    }


    // Looks for .sln file as solution root marker, walking up the directory tree.
    private static string? FindSolutionRoot()
    {
        var dir = AppDomain.CurrentDomain.BaseDirectory;
        while (dir != null)
        {
            if (Directory.GetFiles(dir, "*.sln").Any())
                return dir;
            dir = Directory.GetParent(dir)?.FullName;
        }
        return null;
    }

    public string GetFullPath(Type type)
    {
        Directory.CreateDirectory(BaseDirectory);
        return Path.Combine(BaseDirectory, $"{type.Name.ToLowerInvariant()}.{FileName}");
    }
}
