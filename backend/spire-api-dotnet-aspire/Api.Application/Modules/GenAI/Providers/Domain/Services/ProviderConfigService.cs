using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using SpireCore.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.GenAI.Providers.Domain.Services;
public class ProviderConfigService : ITransientService
{
    private readonly IRepository<Provider> _providerRepo;
    private readonly IRepository<ProviderModel> _modelRepo;
    public ProviderConfigService(IRepository<Provider> providerRepo, IRepository<ProviderModel> modelRepo)
    {
        _providerRepo = providerRepo;
        _modelRepo = modelRepo;
    }

    /// <summary>
    /// Get all ProviderModelConfig variants for the given provider name.
    /// </summary>
    public async Task<List<ProviderModel>> GetModelConfigsForProviderAsync(string providerName)
    {
        var normalized = providerName.ToLowerInvariant();
        var models = await _modelRepo.FindAllAsync(m => m.ProviderName.ToLower() == normalized);
        return models.ToList();
    }

    /// <summary>
    /// Get all ProviderModelConfig variants for the given provider ID.
    /// </summary>
    public async Task<List<ProviderModel>> GetModelConfigsForProviderIdAsync(Guid providerId)
    {
        var provider = await _providerRepo.FindAsync(p => p.Id == providerId);
        if (provider == null)
            return new List<ProviderModel>();
        var models = await _modelRepo.FindAllAsync(m => m.ProviderName == provider.Name);
        return models.ToList();
    }

    /// <summary>
    /// Get a ProviderConfig with all its model configs hydrated (from modelRepo).
    /// </summary>
    public async Task<Provider?> GetProviderWithModelsAsync(string providerName)
    {
        var normalized = providerName.ToLowerInvariant();
        var provider = await _providerRepo.FindAsync(p => p.Name.ToLower() == normalized);
        if (provider == null)
            return null;
        provider.Models = await GetModelConfigsForProviderAsync(provider.Name); // use actual name casing if needed
        return provider;
    }

    /// <summary>
    /// List all providers with their model configs (could be expensive).
    /// </summary>
    public async Task<List<Provider>> GetAllProvidersWithModelsAsync()
    {
        var providers = await _providerRepo.GetAllAsync();
        foreach (var provider in providers)
            provider.Models = await GetModelConfigsForProviderAsync(provider.Name);
        return providers.ToList();
    }
}