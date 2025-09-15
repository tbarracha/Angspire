using System.Text.Json;

namespace Genspire.Application.Modules.GenAI.Client;
public static partial class AiClientExtensions
{
    /// <summary>
    /// Extracts the "delta.content" token from a raw OpenRouter streaming JSON line (after removing "data:").
    /// Returns null if the token is not present or empty.
    /// </summary>
    public static string? ParseRawChatStreamForOpenRouter(string rawData)
    {
        if (string.IsNullOrWhiteSpace(rawData) || !rawData.StartsWith("data:"))
            return null;
        var data = rawData[5..].Trim();
        if (data == "[DONE]")
            return null;
        try
        {
            using var doc = JsonDocument.Parse(data);
            if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
            {
                var choice = choices[0];
                if (choice.TryGetProperty("delta", out var delta) && delta.TryGetProperty("content", out var contentValue))
                {
                    return contentValue.GetString();
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("[PARSE ERROR in RawStreamOpenRouterParser]: " + ex.Message);
        }

        return null;
    }
}