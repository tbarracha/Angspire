using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.DbProviders.Mongo.Entities;

namespace Genspire.Application.Modules.GenAI.Providers.Domain.Models;

// Optional tiny value object for display and currency consistency
public class ModelPricing
{
    /// <summary>Cost per 1,000,000 input tokens (e.g., USD).</summary>
    public decimal? InputPerMTokens { get; set; }
    /// <summary>Cost per 1,000,000 output tokens (e.g., USD).</summary>
    public decimal? OutputPerMTokens { get; set; }
    /// <summary>ISO currency code (e.g., "USD").</summary>
    public string? Currency { get; set; } = "USD";
}

public class Provider : MongoAuditableEntity
{
    public required string Name { get; set; }
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }

    [BsonRepresentation(BsonType.String)]
    public List<Guid> SupportedTagIds { get; set; } = new();
    public List<string> SupportedTagNames { get; set; } = new();

    public string? ApiBaseUrl { get; set; }
    public bool Enabled { get; set; } = true;
    public string? ApiKey { get; set; }

    /// <summary>Default HTTP timeout in seconds for this provider (model can override).</summary>
    public int? DefaultTimeoutSeconds { get; set; }

    /// <summary>Default pricing for models under this provider.</summary>
    public ModelPricing? DefaultPricing { get; set; }

    public List<ProviderModel> Models { get; set; } = new();

    // ----- Helper fallbacks -----
    public int ResolveTimeoutSeconds(int globalDefaultSeconds = 100)
        => DefaultTimeoutSeconds ?? globalDefaultSeconds;

    public (decimal? inPerM, decimal? outPerM, string currency) ResolvePricing()
    {
        var currency = DefaultPricing?.Currency ?? "USD";
        return (DefaultPricing?.InputPerMTokens, DefaultPricing?.OutputPerMTokens, currency);
    }
}

public class ProviderModel : MongoAuditableEntity
{
    public required string ProviderName { get; set; }
    public required string Name { get; set; }
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }

    [BsonRepresentation(BsonType.String)]
    public List<Guid> SupportedTagIds { get; set; } = new();
    public List<string> SupportedTagNames { get; set; } = new();

    public string? ApiKey { get; set; }
    public string? ApiEndpoint { get; set; }

    public object? ReasoningEnable { get; set; }
    public object? ReasoningDisable { get; set; }
    public string? ReasoningOpenTag { get; set; }
    public string? ReasoningClosingTag { get; set; }

    // NEW: per-model overrides
    /// <summary>Specific HTTP timeout for this model (seconds).</summary>
    public int? TimeoutSeconds { get; set; }
    /// <summary>Specific pricing for this model.</summary>
    public ModelPricing? Pricing { get; set; }

    // Typed accessors (existing)
    public string? GetReasoningEnableAsString() => ReasoningEnable as string;
    public bool? GetReasoningEnableAsBool() => ReasoningEnable is bool b ? b : (bool?)null;
    public string? GetReasoningDisableAsString() => ReasoningDisable as string;
    public bool? GetReasoningDisableAsBool() => ReasoningDisable is bool b ? b : (bool?)null;

    // ----- Helpers: resolve with provider/global fallbacks -----
    public int ResolveTimeoutSeconds(Provider provider, int globalDefaultSeconds = 100)
        => TimeoutSeconds ?? provider.ResolveTimeoutSeconds(globalDefaultSeconds);

    public (decimal? inPerM, decimal? outPerM, string currency) ResolvePricing(Provider provider)
    {
        var p = Pricing;
        var cur = p?.Currency ?? provider.DefaultPricing?.Currency ?? "USD";
        var inM = p?.InputPerMTokens ?? provider.DefaultPricing?.InputPerMTokens;
        var outM = p?.OutputPerMTokens ?? provider.DefaultPricing?.OutputPerMTokens;
        return (inM, outM, cur);
    }

    /// <summary>Total estimated cost for a call given token counts.</summary>
    public decimal? EstimateCost(Provider provider, long inputTokens, long outputTokens)
    {
        var (inPerM, outPerM, _) = ResolvePricing(provider);
        if (inPerM is null && outPerM is null) return null;

        decimal total = 0m;
        if (inPerM is { } i) total += i * (inputTokens / 1_000_000m);
        if (outPerM is { } o) total += o * (outputTokens / 1_000_000m);
        return total;
    }
}
