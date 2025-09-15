using ChromaDB.Client;

namespace Genspire.Application.Modules.Knowledge.Domain.Services;
public class ChromaDbService
{
    private readonly ChromaClient _client;
    private readonly HttpClient _httpClient;
    private readonly ChromaConfigurationOptions _config;
    public ChromaDbService(string baseUrl = "http://localhost:8000/api/v1/")
    {
        _config = new ChromaConfigurationOptions(uri: baseUrl);
        _httpClient = new HttpClient();
        _client = new ChromaClient(_config, _httpClient);
    }

    // Returns the server version
    public async Task<string> GetVersionAsync()
    {
        return await _client.GetVersion();
    }

    // Gets or creates a collection (returns ChromaCollectionClient)
    public async Task<ChromaCollectionClient> GetOrCreateCollectionAsync(string name)
    {
        var collection = await _client.GetOrCreateCollection(name);
        return new ChromaCollectionClient(collection, _config, _httpClient);
    }

    // Add a single embedding
    public async Task AddEmbeddingAsync(string collectionName, string id, float[] embedding, string? document = null)
    {
        var coll = await GetOrCreateCollectionAsync(collectionName);
        await coll.Add([id], embeddings: [new(embedding)], documents: document is not null ? [document] : null);
    }

    // Query by embedding
    public async Task<IEnumerable<(string Id, float Distance)>> QueryAsync(string collectionName, float[] embedding)
    {
        var coll = await GetOrCreateCollectionAsync(collectionName);
        // Only request distances; ids are always present in the result
        var queryData = await coll.Query([new(embedding)], include: ChromaQueryInclude.Distances);
        return queryData.SelectMany(item => item.Select(entry => (entry.Id, entry.Distance)));
    }
}