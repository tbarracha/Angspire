using System.Text.Json;

namespace Genspire.Application.Modules.GenAI.Client.AiClients;
public abstract partial class AiClient : BaseAIClient
{
    protected AiClient(string baseUrl, string? endpointPath = null, string? apiKey = null, HttpClient? http = null, JsonSerializerOptions? jsonOptions = null) : base(baseUrl, endpointPath, apiKey, http, jsonOptions)
    {
    }
}