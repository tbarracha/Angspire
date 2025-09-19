namespace Genspire.Application.Modules.GenAI.Generation;

public interface IAsyncGenerator<TRequest, TResponse>
{
    IAsyncEnumerable<TResponse> StreamGenerationAsync(TRequest request, CancellationToken cancellationToken = default);
}