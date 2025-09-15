using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.GenAI.Providers.Operations;
public class SeedProvidersRequest
{
    public bool OverwriteExisting { get; set; } = false;
}

public class SeedProvidersResponse
{
    public int ProvidersSeeded { get; set; }
    public int ModelsSeeded { get; set; }
}

[OperationGroup("Dev")]
[OperationRoute("provider/seed")]
public sealed class SeedProvidersOperation : OperationBase<SeedProvidersRequest, SeedProvidersResponse>
{
    private readonly IRepository<Provider> _providerRepo;
    private readonly IRepository<ProviderModel> _modelRepo;
    public SeedProvidersOperation(IRepository<Provider> providerRepo, IRepository<ProviderModel> modelRepo)
    {
        _providerRepo = providerRepo;
        _modelRepo = modelRepo;
    }

    protected override async Task<SeedProvidersResponse> HandleAsync(SeedProvidersRequest request)
    {
        int providersSeeded = 0, modelsSeeded = 0;
        foreach (var provider in DefaultProviderConfigs.All)
        {
            // Try to find existing provider by Name
            var existing = await _providerRepo.FindAsync(x => x.Name == provider.Name);
            if (existing != null)
            {
                if (request.OverwriteExisting)
                {
                    provider.Id = existing.Id;
                    await _providerRepo.UpdateAsync(x => x.Name == provider.Name, provider);
                    providersSeeded++;
                }
                else
                {
                    continue;
                }
            }
            else
            {
                provider.Id = Guid.NewGuid();
                await _providerRepo.AddAsync(provider);
                providersSeeded++;
            }

            // Remove all old models for this provider if overwriting
            if (request.OverwriteExisting)
            {
                var oldModels = await _modelRepo.FindAllAsync(m => m.ProviderName == provider.Name);
                foreach (var om in oldModels)
                    await _modelRepo.DeleteAsync(m => m.Id == om.Id);
            }

            // Add/update models
            foreach (var model in provider.Models)
            {
                model.ProviderName = provider.Name;
                // Try to find existing by (ProviderName, Name)
                var exists = (await _modelRepo.FindAllAsync(m => m.ProviderName == model.ProviderName && m.Name == model.Name)).FirstOrDefault();
                if (exists != null)
                {
                    if (request.OverwriteExisting)
                    {
                        model.Id = exists.Id;
                        await _modelRepo.UpdateAsync(m => m.Id == model.Id, model);
                        modelsSeeded++;
                    }
                }
                else
                {
                    model.Id = Guid.NewGuid();
                    await _modelRepo.AddAsync(model);
                    modelsSeeded++;
                }
            }
        }

        return new SeedProvidersResponse
        {
            ProvidersSeeded = providersSeeded,
            ModelsSeeded = modelsSeeded
        };
    }
}