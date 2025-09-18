using Genspire.Application.Modules.GenAI.Client.Factory;
using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Services;
using Microsoft.Extensions.Logging;
using SpireCore.Services;

namespace Genspire.Application.Modules.GenAI.Client.AiClients;
public class AiClientService : IScopedService
{
    private readonly ILogger<AiClientService> _log;
    private readonly ProviderConfigService _providerConfigs;
    private readonly IAIClientFactory _clientFactory;
    public AiClientService(ILogger<AiClientService> log, ProviderConfigService providerConfigs, IAIClientFactory clientFactory)
    {
        _log = log;
        _providerConfigs = providerConfigs;
        _clientFactory = clientFactory;
    }

    public async Task<(AiClient client, string endpoint, ProviderModel? modelCfg, Provider providerCfg)> ResolveClientAsync(string providerName, string? modelName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(providerName))
            throw new InvalidOperationException("Provider is required.");
        var providerCfg = await _providerConfigs.GetProviderWithModelsAsync(providerName) ?? throw new InvalidOperationException($"Provider '{providerName}' not found.");
        if (!providerCfg.Enabled)
            throw new InvalidOperationException($"Provider '{providerName}' is disabled.");
        ProviderModel? modelCfg = null;
        if (!string.IsNullOrWhiteSpace(modelName))
        {
            modelCfg = providerCfg.Models?.FirstOrDefault(m => string.Equals(m.Name, modelName, StringComparison.OrdinalIgnoreCase));
        }

        modelCfg ??= providerCfg.Models?.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.ApiEndpoint));
        var baseUrl = NormalizeBase(providerCfg.ApiBaseUrl);
        var modelPath = NormalizePath(modelCfg?.ApiEndpoint ?? "chat/completions");
        var endpoint = CombineUrl(baseUrl, modelPath);
        var client = await _clientFactory.GetClientAsync(providerCfg, modelCfg);
        return (client, endpoint, modelCfg, providerCfg);
    }

    // --- URL helpers (internal to client resolution) ---
    private static string NormalizePath(string? endpoint)
    {
        const string fallback = "chat/completions";
        if (string.IsNullOrWhiteSpace(endpoint))
            return fallback;
        var ep = endpoint.Trim();
        if (ep.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                return new Uri(ep, UriKind.Absolute).AbsolutePath.Trim('/');
            }
            catch
            {
                return fallback;
            }
        }

        return ep.Trim().TrimStart('/');
    }

    private static string NormalizeBase(string? baseUrl) => string.IsNullOrWhiteSpace(baseUrl) ? string.Empty : baseUrl.Trim().TrimEnd('/') + "/";
    private static string CombineUrl(string baseUrl, string relativePath) => string.IsNullOrEmpty(baseUrl) ? relativePath : $"{NormalizeBase(baseUrl)}{NormalizePath(relativePath)}";
}