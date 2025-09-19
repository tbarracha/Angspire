using Genspire.Application.Modules.GenAI.Client.AiClients;
using Genspire.Application.Modules.GenAI.Client.Factory;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Services;
using Genspire.Application.Modules.Identity.Tags.Domain.Models;
using SpireCore.Services;
using System.Runtime.CompilerServices;

namespace Genspire.Application.Modules.GenAI.Common.Completions.Services;

public class ChatCompletionService : ITransientService
{
    private readonly ProviderConfigService _providerService;
    private readonly IAIClientFactory _aiClientFactory;

    public ChatCompletionService(ProviderConfigService providerService, IAIClientFactory aiClientFactory)
    {
        _providerService = providerService;
        _aiClientFactory = aiClientFactory;
    }

    // OpenAI-style fallback path (relative). Providers should override with their model ApiEndpoint.
    private const string FallbackEndpoint = "chat/completions";
    private static string NormalizePath(string? endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
            return FallbackEndpoint;
        var ep = endpoint.Trim();
        // We want to COMBINE provider.ApiBaseUrl + model.ApiEndpoint.
        // If someone mistakenly put a full URL into ApiEndpoint, strip to path to avoid double bases.
        if (ep.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(ep, UriKind.Absolute);
                return uri.AbsolutePath.Trim('/'); // keep only the path segment
            }
            catch
            {
                return FallbackEndpoint;
            }
        }

        return ep.Trim().TrimStart('/'); // relative path only
    }

    private static string NormalizeBase(string? baseUrl)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
            return string.Empty;
        // Ensure exactly one trailing slash
        return baseUrl.Trim().TrimEnd('/') + "/";
    }

    private static string CombineUrl(string baseUrl, string relativePath)
    {
        if (string.IsNullOrEmpty(baseUrl))
        {
            // No base — return relative path as-is (useful for unit tests or custom clients).
            return relativePath;
        }

        return $"{NormalizeBase(baseUrl)}{NormalizePath(relativePath)}";
    }

    /// <summary>
    /// Resolve provider + (optional) model, compute final endpoint (provider base + model endpoint),
    /// and build the AiClient WITHOUT a second DB round-trip (uses the factory overload).
    /// </summary>
    private async Task<(AiClient client, string endpoint)> ResolveClientAndEndpointAsync(string providerName, string? modelName)
    {
        var provider = await _providerService.GetProviderWithModelsAsync(providerName) ?? throw new InvalidOperationException($"Provider '{providerName}' not found.");
        if (!provider.Enabled)
            throw new InvalidOperationException($"Provider '{providerName}' is disabled.");
        // Pick requested model if present; otherwise prefer first model that has an explicit ApiEndpoint
        ProviderModel? modelConfig = null;
        if (!string.IsNullOrWhiteSpace(modelName))
        {
            modelConfig = provider.Models?.FirstOrDefault(m => string.Equals(m.Name, modelName, StringComparison.OrdinalIgnoreCase));
        }

        modelConfig ??= provider.Models?.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.ApiEndpoint));
        // Resolve the final endpoint = provider.ApiBaseUrl + model.ApiEndpoint (or fallback)
        var baseUrl = NormalizeBase(provider.ApiBaseUrl);
        var modelPath = NormalizePath(modelConfig?.ApiEndpoint ?? provider.Models?.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.ApiEndpoint))?.ApiEndpoint ?? FallbackEndpoint);
        var finalEndpoint = CombineUrl(baseUrl, modelPath);
        var client = await _aiClientFactory.GetClientAsync(provider, modelConfig) as AiClient ?? throw new InvalidOperationException($"No AiClient for provider '{providerName}'.");
        return (client, finalEndpoint);
    }

    public async Task<ChatResponse> CompleteAsync(ChatRequest request)
    {
        var providerName = request.Provider ?? "OpenRouter";
        var modelName = request.Model;
        request.Stream = false;
        var (client, endpoint) = await ResolveClientAndEndpointAsync(providerName, modelName);
        return await client.CreateChatCompletionAsync(request, endpoint, providerName);
    }

    public async IAsyncEnumerable<ChatResponse> StreamCompletionAsync(ChatRequest request, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var providerName = request.Provider ?? "OpenRouter";
        var modelName = request.Model;
        request.Stream = true;
        var (client, endpoint) = await ResolveClientAndEndpointAsync(providerName, modelName);
        await foreach (var chatResponse in client.StreamChatCompletionAsync(request, endpoint, providerName, cancellationToken).WithCancellation(cancellationToken))
        {
            yield return chatResponse;
        }
    }

    public async Task<ProviderModel?> GetModelConfigForTagAsync(string providerName, Tag tag)
    {
        var provider = await _providerService.GetProviderWithModelsAsync(providerName);
        if (provider == null || provider.Models == null)
            return null;
        return provider.Models.FirstOrDefault(m => (tag.Id != Guid.Empty && m.SupportedTagIds.Contains(tag.Id)) || (!string.IsNullOrWhiteSpace(tag.DisplayName) && m.SupportedTagNames.Contains(tag.DisplayName!)));
    }

    public async Task<string?> GetModelNameForTagAsync(string providerName, Tag tag)
    {
        var modelConfig = await GetModelConfigForTagAsync(providerName, tag);
        return modelConfig?.Name;
    }

    public async Task<string?> GetApiKeyForTagAsync(string providerName, Tag tag)
    {
        var provider = await _providerService.GetProviderWithModelsAsync(providerName);
        var modelConfig = provider?.Models.FirstOrDefault(m => (tag.Id != Guid.Empty && m.SupportedTagIds.Contains(tag.Id)) || (!string.IsNullOrWhiteSpace(tag.DisplayName) && m.SupportedTagNames.Contains(tag.DisplayName!)));
        // Prefer model-level API key; fallback to provider-level key
        if (!string.IsNullOrEmpty(modelConfig?.ApiKey))
            return modelConfig!.ApiKey;
        return provider?.ApiKey;
    }
}