namespace Genspire.Application.Modules.GenAI.Client;
public static partial class AiClientExtensions
{
    /// <summary>
    /// Dispatches to the correct parser for a raw stream line based on provider name.
    /// </summary>
    public static string? ParseChatStreamContentForProvider(string provider, string rawLine)
    {
        if (string.IsNullOrWhiteSpace(provider))
            return null;
        switch (provider.Trim().ToLowerInvariant())
        {
            case "openrouter":
                return ParseRawChatStreamForOpenRouter(rawLine);
            // Future: Add additional providers here.
            // case "ollama":
            //     return RawStreamOllamaParser(rawLine);
            default:
                // Default: try OpenRouter parser, or simply ignore/return null
                return ParseRawChatStreamForOpenRouter(rawLine);
        }
    }
}