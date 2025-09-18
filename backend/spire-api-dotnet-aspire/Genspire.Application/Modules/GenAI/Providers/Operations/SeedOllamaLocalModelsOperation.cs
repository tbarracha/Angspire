// File: Genspire.Application/Modules/GenAI/Providers/Operations/SeedOllamaLocalModelsOperation.cs

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Genspire.Application.Modules.Identity.Tags.Domain.Defaults;    // <-- for DefaultTags
using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.GenAI.Providers.Operations;

/* =========================
 * Request / Response
 * ========================= */

public sealed class SeedOllamaModelsRequest
{
    [DefaultValue("http://localhost:11434")]
    public string? BaseUrl { get; set; }                  // default http://localhost:11434
    [DefaultValue(true)]
    public bool OverwriteExisting { get; set; } = false;  // update existing entries
    [DefaultValue(false)]
    public bool EnsureProvider { get; set; } = true;      // create/update ProviderConfig
    [DefaultValue("Ollama")]
    public string ProviderName { get; set; } = "Ollama";  // provider key
    [DefaultValue(false)]
    public bool CleanupMissing { get; set; } = false;     // delete models not found locally
}

public sealed class SeedOllamaModelsResponse
{
    public bool OllamaReachable { get; set; }
    public string? OllamaBaseUrl { get; set; }
    public int ModelsDiscovered { get; set; }
    public int ModelsSeeded { get; set; }
    public int ModelsUpdated { get; set; }
    public int ModelsDeleted { get; set; }
    public Guid? ProviderId { get; set; }
    public string? Error { get; set; }
}

/* =========================
 * Operation
 * ========================= */

[OperationGroup("Dev")]
[OperationRoute("provider/seed/ollama")]
public sealed class SeedOllamaLocalModelsOperation
    : OperationBase<SeedOllamaModelsRequest, SeedOllamaModelsResponse>
{
    private readonly IRepository<Provider> _providerRepo;
    private readonly IRepository<ProviderModel> _modelRepo;

    public SeedOllamaLocalModelsOperation(
        IRepository<Provider> providerRepo,
        IRepository<ProviderModel> modelRepo)
    {
        _providerRepo = providerRepo;
        _modelRepo = modelRepo;
    }

    protected override async Task<SeedOllamaModelsResponse> HandleAsync(SeedOllamaModelsRequest request)
    {
        var resp = new SeedOllamaModelsResponse();

        var providerName = (request.ProviderName ?? "Ollama").Trim();
        var baseUrlNoSlash = (request.BaseUrl ?? "http://localhost:11434").Trim().TrimEnd('/');
        var providerApiBase = $"{baseUrlNoSlash}/api"; // align with DefaultProviderConfigs (…/api)
        resp.OllamaBaseUrl = baseUrlNoSlash;

        // Ensure provider if requested
        Provider? provider = null;
        if (request.EnsureProvider)
        {
            provider = await _providerRepo.FindAsync(p => p.Name.ToLower() == providerName.ToLower());
            if (provider is null)
            {
                provider = new Provider
                {
                    Id = Guid.NewGuid(),
                    Name = providerName,
                    DisplayName = "Ollama",
                    ApiBaseUrl = providerApiBase,
                    Enabled = true
                };
                await _providerRepo.AddAsync(provider);
            }
            else
            {
                // Keep ApiBaseUrl consistent with /api suffix
                if (!string.Equals(provider.ApiBaseUrl?.TrimEnd('/'), providerApiBase, StringComparison.OrdinalIgnoreCase))
                {
                    provider.ApiBaseUrl = providerApiBase;
                    await _providerRepo.UpdateAsync(p => p.Id == provider.Id, provider);
                }
            }
            resp.ProviderId = provider.Id;
        }
        else
        {
            provider = await _providerRepo.FindAsync(p => p.Name.ToLower() == providerName.ToLower());
            if (provider?.ApiBaseUrl is string fromProvider && string.IsNullOrWhiteSpace(request.BaseUrl))
            {
                // let queries still use baseUrlNoSlash; provider base used only for storage
                resp.OllamaBaseUrl = baseUrlNoSlash;
            }
        }

        // Query Ollama /api/tags
        List<OllamaModelTag> discovered = new();
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
            using var httpResp = await http.GetAsync($"{baseUrlNoSlash}/api/tags");
            resp.OllamaReachable = httpResp.IsSuccessStatusCode;

            if (!httpResp.IsSuccessStatusCode)
            {
                resp.Error = $"Ollama returned HTTP {(int)httpResp.StatusCode} - {httpResp.ReasonPhrase}";
                return resp;
            }

            await using var stream = await httpResp.Content.ReadAsStreamAsync();
            var tags = await JsonSerializer.DeserializeAsync<OllamaTagsResponse>(
                stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (tags?.Models is { Count: > 0 })
                discovered = tags.Models;
        }
        catch (Exception ex)
        {
            resp.OllamaReachable = false;
            resp.Error = $"Failed to query Ollama at {baseUrlNoSlash}: {ex.Message}";
            return resp;
        }

        resp.ModelsDiscovered = discovered.Count;

        // Optional cleanup of missing models
        if (request.OverwriteExisting && request.CleanupMissing)
        {
            var discoveredNames = discovered.Select(m => m.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var existing = await _modelRepo.FindAllAsync(m => m.ProviderName.ToLower() == providerName.ToLower());
            foreach (var old in existing)
            {
                if (!discoveredNames.Contains(old.Name))
                {
                    await _modelRepo.DeleteAsync(m => m.Id == old.Id);
                    resp.ModelsDeleted++;
                }
            }
        }

        // Defaults we want to enforce on creation / overwrite
        static (List<Guid> ids, List<string> names) DefaultTextTags() => (
            new List<Guid> { DefaultTags.AiGeneration.Text.Id },
            new List<string> { DefaultTags.AiGeneration.Text.DisplayName }
        );

        // Upsert models
        foreach (var tag in discovered)
        {
            var existing = (await _modelRepo.FindAllAsync(
                m => m.ProviderName.ToLower() == providerName.ToLower() &&
                     m.Name.ToLower() == tag.Name.ToLower())).FirstOrDefault();

            var (defaultTagIds, defaultTagNames) = DefaultTextTags();

            var model = new ProviderModel
            {
                ProviderName = providerName,
                Name = tag.Name,
                DisplayName = BuildDisplayName(tag),
                ImageUrl = null,
                ApiEndpoint = "chat",                  // <-- DEFAULT endpoint override
                SupportedTagIds = defaultTagIds,       // <-- DEFAULT text tag
                SupportedTagNames = defaultTagNames    // <-- DEFAULT text tag
            };

            if (existing is null)
            {
                model.Id = Guid.NewGuid();
                await _modelRepo.AddAsync(model);
                resp.ModelsSeeded++;
            }
            else if (request.OverwriteExisting)
            {
                // Overwrite to enforce defaults; you can edit special cases later (e.g., embeddings).
                model.Id = existing.Id;
                await _modelRepo.UpdateAsync(m => m.Id == existing.Id, model);
                resp.ModelsUpdated++;
            }
            // else: keep existing as-is
        }

        return resp;
    }

    private static string? BuildDisplayName(OllamaModelTag tag)
    {
        var d = tag.Details;
        if (d is not null)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(d.Family)) parts.Add(ToTitleCase(d.Family));
            if (!string.IsNullOrWhiteSpace(d.ParameterSize)) parts.Add(d.ParameterSize);
            if (!string.IsNullOrWhiteSpace(d.QuantizationLevel)) parts.Add(d.QuantizationLevel);
            var s = string.Join(" • ", parts);
            if (!string.IsNullOrWhiteSpace(s)) return s;
        }
        return tag.Name;
    }

    private static string ToTitleCase(string s)
        => string.IsNullOrWhiteSpace(s) ? s : char.ToUpperInvariant(s[0]) + s[1..];
}

/* =========================
 * DTOs for /api/tags (non file-local)
 * ========================= */

internal sealed class OllamaTagsResponse
{
    [JsonPropertyName("models")]
    public List<OllamaModelTag> Models { get; set; } = new();
}

internal sealed class OllamaModelTag
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("modified_at")]
    public string? ModifiedAt { get; set; }

    [JsonPropertyName("size")]
    public long? Size { get; set; }

    [JsonPropertyName("digest")]
    public string? Digest { get; set; }

    [JsonPropertyName("details")]
    public OllamaModelDetails? Details { get; set; }
}

internal sealed class OllamaModelDetails
{
    [JsonPropertyName("parent_model")]
    public string? ParentModel { get; set; }

    [JsonPropertyName("format")]
    public string? Format { get; set; }

    [JsonPropertyName("family")]
    public string? Family { get; set; }

    [JsonPropertyName("families")]
    public List<string>? Families { get; set; }

    [JsonPropertyName("parameter_size")]
    public string? ParameterSize { get; set; }

    [JsonPropertyName("quantization_level")]
    public string? QuantizationLevel { get; set; }
}
