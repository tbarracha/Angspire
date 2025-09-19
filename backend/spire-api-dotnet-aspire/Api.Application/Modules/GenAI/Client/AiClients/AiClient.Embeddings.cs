using Genspire.Application.Modules.GenAI.Generation.Embeddings.Domain;
using System.Net.Http.Json;

namespace Genspire.Application.Modules.GenAI.Client.AiClients;
public abstract partial class AiClient : BaseAIClient
{
    // Default endpoint; providers can override if different
    protected virtual string EmbeddingEndpoint => "api/embed";

    public virtual async Task<EmbeddingGenerationResponse> CreateEmbeddingAsync(EmbeddingGenerationRequest request, CancellationToken ct = default)
    {
        var response = await PostAsync(EmbeddingEndpoint, request, ct);
        // Use System.Net.Http.Json extension for convenience
        var result = await response.Content.ReadFromJsonAsync<EmbeddingGenerationResponse>(options: _jsonOptions, cancellationToken: ct);
        if (result == null)
            throw new InvalidOperationException("Embedding endpoint returned null response.");
        return result;
    }
}