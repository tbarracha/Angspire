// OperationLogOptions.cs

namespace SpireCore.API.Operations.Logs;

public enum OperationCategory
{
    Rest,
    Streamable,
    WebSockets
}

public enum OperationLogLevel
{
    None = 0,
    Trace = 1,
    Debug = 2,
    Information = 3,
    Warning = 4,
    Error = 5,
    Critical = 6
}

public sealed class OperationsOptions
{
    public OperationLoggingOptions Logging { get; set; } = new();
}

public sealed class OperationLoggingOptions
{
    /// Master kill-switch for all operation logs.
    public bool Enabled { get; set; } = true;

    /// Default minimum level if a category is enabled but no level is set.
    public OperationLogLevel DefaultLevel { get; set; } = OperationLogLevel.Information;

    /// REST (classic) operation logging options.
    public OperationLogCategoryOptions Rest { get; set; } = new();

    /// NDJSON streamable operation logging options.
    public StreamableLogOptions Streamable { get; set; } = new();

    /// WebSocket operation logging options.
    public WebSocketLogOptions WebSockets { get; set; } = new();
}

public class OperationLogCategoryOptions
{
    public bool Enabled { get; set; } = true;
    public OperationLogLevel Level { get; set; } = OperationLogLevel.Information;

    // Optional detail toggles
    public bool IncludeTiming { get; set; } = true;
    public bool IncludeHeaders { get; set; } = false;

    // Body capture caps (null = unlimited; use conservative defaults in prod)
    public int? MaxRequestBodyChars { get; set; } = null;
    public int? MaxResponseBodyChars { get; set; } = null;
}

public sealed class StreamableLogOptions : OperationLogCategoryOptions
{
    /// Max characters captured for each streamed frame.
    public int? MaxFrameChars { get; set; } = 2048;
}

public sealed class WebSocketLogOptions : OperationLogCategoryOptions
{
    /// Max characters captured for each WS frame.
    public int? MaxFrameChars { get; set; } = 2048;
}

// Small helper to evaluate policy without bringing a logger here.
internal static class OperationLoggingPolicy
{
    public static bool IsEnabled(OperationsOptions root, OperationCategory category, OperationLogLevel requested)
    {
        if (!root.Logging.Enabled) return false;

        var cat = GetCategory(root.Logging, category);
        if (!cat.Enabled) return false;

        var threshold = cat.Level != OperationLogLevel.None
            ? cat.Level
            : root.Logging.DefaultLevel;

        if (threshold == OperationLogLevel.None) return false;

        return requested >= threshold;
    }

    public static OperationLogCategoryOptions GetCategory(OperationLoggingOptions o, OperationCategory category) =>
        category switch
        {
            OperationCategory.Rest => o.Rest,
            OperationCategory.Streamable => o.Streamable,
            OperationCategory.WebSockets => o.WebSockets,
            _ => o.Rest
        };
}