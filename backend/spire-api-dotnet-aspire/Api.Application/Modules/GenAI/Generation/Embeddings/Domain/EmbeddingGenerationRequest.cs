using System.ComponentModel;
using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.GenAI.Generation.Embeddings.Domain;
public class EmbeddingGenerationRequest
{
    [DefaultValue("ollama")]
    public string Provider { get; set; } = string.Empty;

    [DefaultValue("bge-m3")]
    public string Model { get; set; } = string.Empty;
    public List<string> Inputs { get; set; } = new();
}

public record EmbeddingGenerationResponse
{
    [JsonPropertyName("model")]
    public string Model { get; init; } = string.Empty;

    [JsonPropertyName("embeddings")]
    public List<List<float>> Embeddings { get; init; } = new();

    [JsonPropertyName("usage")]
    public EmbeddingUsage Usage { get; init; } = new();
}

public record EmbeddingUsage
{
    public int InputCount { get; init; }
    public int TotalTokens { get; init; }
    public long? LoadDuration { get; init; }
    public long? TotalDuration { get; init; }
}