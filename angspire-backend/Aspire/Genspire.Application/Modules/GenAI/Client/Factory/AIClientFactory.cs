using Genspire.Application.Modules.GenAI.Client.AiClients;
using Genspire.Application.Modules.GenAI.Client.Ollama;
using Genspire.Application.Modules.GenAI.Client.OpenRouter;
using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Services;
using SpireCore.Services;

namespace Genspire.Application.Modules.GenAI.Client.Factory;
public class AIClientFactory : IAIClientFactory, ISingletonService
{
    private readonly ProviderConfigService _providerConfigService;
    public AIClientFactory(ProviderConfigService providerConfigService)
    {
        _providerConfigService = providerConfigService;
    }

    /// <summary>
    /// Fetches provider from DB.
    /// </summary>
    public async Task<AiClient> GetClientAsync(string provider)
    {
        var providerConfig = await _providerConfigService.GetProviderWithModelsAsync(provider);
        if (providerConfig is null || !providerConfig.Enabled)
            throw new InvalidOperationException($"Provider '{provider}' not found or disabled.");
        // Prefer the first model with an endpoint (if any)
        var modelWithEndpoint = providerConfig.Models.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.ApiEndpoint));
        return BuildClient(providerConfig, modelWithEndpoint);
    }

    /// <summary>
    /// Build a client when you already have the provider (and optionally the model).
    /// </summary>
    public Task<AiClient> GetClientAsync(Provider providerConfig, ProviderModel? modelConfig = null)
    {
        if (providerConfig is null || !providerConfig.Enabled)
            throw new InvalidOperationException("Provider not found or disabled.");
        var client = BuildClient(providerConfig, modelConfig);
        return Task.FromResult(client);
    }

    // ---------- helpers ----------
    private static AiClient BuildClient(Provider providerConfig, ProviderModel? modelConfig)
    {
        // base URL
        var baseUrl = (providerConfig.ApiBaseUrl ?? throw new InvalidOperationException("ApiBaseUrl missing.")).TrimEnd('/');
        // endpoint path: model first, else any model with endpoint, else default
        var endpointPath = (modelConfig?.ApiEndpoint ?? providerConfig.Models.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.ApiEndpoint))?.ApiEndpoint ?? "chat/completions")!.Trim();
        // api key: model overrides provider
        var apiKey = modelConfig?.ApiKey ?? providerConfig.ApiKey;
        // If endpoint was absolute, split out base and relative path
        NormalizeBaseAndEndpoint(ref baseUrl, ref endpointPath);
        var providerName = providerConfig.Name.Trim().ToLowerInvariant();
        return providerName switch
        {
            "openrouter" => new OpenRouterClient(baseUrl, endpointPath, apiKey),
            "openai" => new OpenRouterClient(baseUrl, endpointPath, apiKey), // alias
            "ollama" => new OllamaClient(baseUrl, endpointPath, apiKey),
            _ => throw new NotSupportedException($"Provider '{providerConfig.Name}' is not supported. Supported: OpenAI, OpenRouter, Ollama")
        };
    }

    private static void NormalizeBaseAndEndpoint(ref string baseUrl, ref string endpointPath)
    {
        if (string.IsNullOrWhiteSpace(endpointPath))
        {
            endpointPath = "chat/completions";
            return;
        }

        endpointPath = endpointPath.Trim();
        if (endpointPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            // Absolute endpoint → split
            var uri = new Uri(endpointPath, UriKind.Absolute);
            // e.g. https://host/api/v1/chat/completions  -> base: https://host/api/v1  endpoint: chat/completions
            var path = uri.AbsolutePath.TrimEnd('/');
            var lastSlash = path.LastIndexOf('/');
            if (lastSlash <= 0)
            {
                baseUrl = uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
                endpointPath = path.Trim('/'); // likely just a single segment
            }
            else
            {
                baseUrl = (uri.GetLeftPart(UriPartial.Authority) + path[..lastSlash]).TrimEnd('/');
                endpointPath = path[(lastSlash + 1)..].Trim('/');
            }
        }
        else
        {
            endpointPath = endpointPath.TrimStart('/');
        }
    }
}