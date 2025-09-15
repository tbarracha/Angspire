using Genspire.Application.Modules.GenAI.Client.AiClients;
using Genspire.Application.Modules.GenAI.Providers.Domain.Models;

namespace Genspire.Application.Modules.GenAI.Client.Factory;
public interface IAIClientFactory
{
    Task<AiClient> GetClientAsync(string provider);
    Task<AiClient> GetClientAsync(Provider providerConfig, ProviderModel? modelConfig = null);
}