using Microsoft.ML.Tokenizers;
using System.Collections.Concurrent;

namespace Genspire.Application.Modules.GenAI.Tokenization.Models;
public class AITokenizer
{
    private readonly string _dataPath;
    private readonly ConcurrentDictionary<string, Tokenizer> _tokenizerCache;
    public AITokenizer(string dataPath = "Data/Tokenizer")
    {
        _dataPath = dataPath;
        _tokenizerCache = new();
        if (!Directory.Exists(_dataPath))
        {
            Directory.CreateDirectory(_dataPath);
        }
    }

    private static readonly Dictionary<string, AITokenizerConfig> TokenizerMap = new()
    {
        {
            "gpt4",
            new AITokenizerConfig(name: "gpt4", extension: "tiktoken", url: "https://huggingface.co/microsoft/Phi-3-small-8k-instruct/resolve/main/cl100k_base.tiktoken")
        },
        {
            "llama",
            new AITokenizerConfig(name: "llama", extension: "model", url: "https://huggingface.co/hf-internal-testing/llama-tokenizer/resolve/main/tokenizer.model")
        }
    };
    public async Task<int> CountTokensAsync(string text, string tokenizerName = "gpt4")
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;
        var tokenizer = await LoadTokenizerAsync(tokenizerName);
        return tokenizer.CountTokens(text);
    }

    public List<string> GetAvailableTokenizers()
    {
        return TokenizerMap.Keys.ToList();
    }

    // ----------- Private Utilities -----------
    private async Task<Tokenizer> LoadTokenizerAsync(string tokenizerName)
    {
        tokenizerName = tokenizerName.ToLowerInvariant();
        if (!TokenizerMap.TryGetValue(tokenizerName, out var config))
        {
            tokenizerName = "gpt4";
            config = TokenizerMap[tokenizerName];
        }

        if (_tokenizerCache.TryGetValue(tokenizerName, out var cached))
            return cached;
        var path = FindLocalTokenizerFile(config.Name) ?? Path.Combine(_dataPath, $"{config.Name}.{config.Extension}");
        var tokenizer = await LoadFromCacheOrUrlAsync(config.Url, path, config.Name);
        _tokenizerCache[tokenizerName] = tokenizer;
        return tokenizer;
    }

    private string? FindLocalTokenizerFile(string tokenizerName)
    {
        var files = Directory.GetFiles(_dataPath, $"{tokenizerName}.*");
        return files.FirstOrDefault();
    }

    private async Task<Tokenizer> LoadFromCacheOrUrlAsync(string url, string path, string name)
    {
        if (!File.Exists(path))
        {
            using var client = new HttpClient();
            using var remote = await client.GetStreamAsync(url);
            using var local = File.Create(path);
            await remote.CopyToAsync(local);
        }

        using var stream = File.OpenRead(path);
        return name switch
        {
            "llama" => LlamaTokenizer.Create(stream),
            _ => await TiktokenTokenizer.CreateAsync(stream, null, null)
        };
    }
}