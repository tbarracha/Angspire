using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.GenAI.Common.Values;
public record ChatChoice
{
    public Guid Id { get; set; } = new Guid();

    [JsonPropertyName("index")]
    public int Index { get; init; }

    [JsonPropertyName("message")]
    public ChatMessage Message { get; init; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; init; } = "stop";
}