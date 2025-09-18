namespace Genspire.Application.Modules.GenAI.Generation.Embeddings.Domain;
public interface IEmbeddingGenerator
{
    string ProviderId { get; }

    Task<EmbeddingGenerationResponse> GenerateEmbeddingAsync(EmbeddingGenerationRequest request, CancellationToken cancellationToken = default);
}