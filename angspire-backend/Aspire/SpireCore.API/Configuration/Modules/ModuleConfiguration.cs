namespace SpireCore.API.Configuration.Modules;

public class ModuleConfiguration
{
    public bool Enabled { get; set; } = true;
    public DbConnectionOptions DbConnection { get; set; } = new();

    /// <summary>Optional HTTP options (timeouts, etc.) for the module.</summary>
    public ModuleHttpOptions? Http { get; set; }
}

public class DbConnectionOptions
{
    public string Provider { get; set; } = "";
    public string ConnectionString { get; set; } = "";
    public string? DatabaseName { get; set; }
}

public class ModuleHttpOptions
{
    /// <summary>Default timeout for HTTP calls made by this module (seconds).</summary>
    public int? TimeoutSeconds { get; set; }
}

public class ModulesConfigurationList : Dictionary<string, ModuleConfiguration> { }
