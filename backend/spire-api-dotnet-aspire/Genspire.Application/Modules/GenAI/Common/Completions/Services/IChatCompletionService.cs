using Genspire.Application.Modules.GenAI.Common.Completions.Models;

namespace Genspire.Application.Modules.GenAI.Common.Completions.Services;

public interface IChatCompletionService
{
    /// <summary>
    /// Gets a complete (non-streaming) chat completion response.
    /// </summary>
    Task<ChatResponse> CompleteAsync(ChatRequest request);

    /// <summary>
    /// Streams the completion response (chunk by chunk as tokens).
    /// </summary>
    IAsyncEnumerable<string> StreamCompletionAsync(ChatRequest request);
}