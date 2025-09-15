namespace SpireCore.API.Configuration.Features;

public class FeatureConfiguration
{
    public bool Enabled { get; set; } = true;
    public string? ConnectionString { get; set; }

    // Support for arbitrary custom settings
    public Dictionary<string, object>? Settings { get; set; }
}
