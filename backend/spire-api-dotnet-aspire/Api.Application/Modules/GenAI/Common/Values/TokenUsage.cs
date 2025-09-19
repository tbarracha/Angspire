using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.GenAI.Common.Values;
public record TokenUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; init; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; init; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens => PromptTokens + CompletionTokens;
}