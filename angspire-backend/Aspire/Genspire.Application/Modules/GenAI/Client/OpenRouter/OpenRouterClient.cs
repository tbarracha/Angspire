using Genspire.Application.Modules.GenAI.Client.AiClients;

namespace Genspire.Application.Modules.GenAI.Client.OpenRouter;
public class OpenRouterClient : AiClient
{
    public override string? Provider => "OpenRouter";

    public OpenRouterClient(string baseUrl, string endpointPath = "chat/completions", string? apiKey = null, HttpClient? httpClient = null) : base(baseUrl, endpointPath, apiKey, httpClient)
    {
    }
}