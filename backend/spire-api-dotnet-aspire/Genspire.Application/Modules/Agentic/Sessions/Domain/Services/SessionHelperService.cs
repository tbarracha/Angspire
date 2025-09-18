// File: Genspire.Application.Modules.Agentic.Sessions/Domain/Services/SessionHelperService.cs
using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.GenAI.Client.AiClients;
using Genspire.Application.Modules.GenAI.Client.Factory;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Services;
using SpireCore.Services;
using System.Text;

namespace Genspire.Application.Modules.Agentic.Sessions.Domain.Services;

public interface ISessionHelperService : IScopedService
{
    // ---- Provider/Model resolution ----
    Task<(AiClient client, string endpoint, ProviderModel? modelCfg, Provider providerCfg)>
        ResolveClientAsync(string providerName, string? modelName, CancellationToken ct = default);

    // ---- Chat request building (chat-only knobs from Text settings) ----
    ChatRequest BuildChatRequest(Session session, SessionMessage input, ChatGenerationArgs gen, string? sysReasoning);

    // ---- Reasoning helper (stringified on/off system content) ----
    string? GetReasoningSystemText(ProviderModel? modelCfg, bool enableThinking);

    // ---- Utilities ----
    string ExtractFinalText(ChatResponse res);
    string CleanTitle(string candidate);
    string FirstNWords(string input, int n);

    // Flatten structured content to text prompt (chat baseline)
    string FlattenContentToText(IEnumerable<SessionMessageContent> parts);

    // Compose ChatGenerationArgs from Session.Settings + per-call toggles (optional)
    ChatGenerationArgs BuildChatArgs(GenerationSettings? baseSettings, string provider, string? model, bool stream, bool enableThinking);
}

public sealed class SessionHelperService : ISessionHelperService
{
    private readonly ProviderConfigService _providerConfigs;
    private readonly IAIClientFactory _clientFactory;

    public SessionHelperService(ProviderConfigService providerConfigs, IAIClientFactory clientFactory)
    {
        _providerConfigs = providerConfigs;
        _clientFactory = clientFactory;
    }

    // ---------------------------------------------------
    // Provider resolution
    // ---------------------------------------------------
    public async Task<(AiClient client, string endpoint, ProviderModel? modelCfg, Provider providerCfg)>
        ResolveClientAsync(string providerName, string? modelName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(providerName))
            throw new InvalidOperationException("Provider is required.");

        var providerCfg = await _providerConfigs.GetProviderWithModelsAsync(providerName)
                          ?? throw new InvalidOperationException($"Provider '{providerName}' not found.");
        if (!providerCfg.Enabled)
            throw new InvalidOperationException($"Provider '{providerName}' is disabled.");

        ProviderModel? modelCfg = null;
        if (!string.IsNullOrWhiteSpace(modelName))
            modelCfg = providerCfg.Models?.FirstOrDefault(m => string.Equals(m.Name, modelName, StringComparison.OrdinalIgnoreCase));
        modelCfg ??= providerCfg.Models?.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.ApiEndpoint));

        var baseUrl = NormalizeBase(providerCfg.ApiBaseUrl);
        var modelPath = NormalizePath(modelCfg?.ApiEndpoint ?? "chat/completions");
        var endpoint = CombineUrl(baseUrl, modelPath);

        var client = await _clientFactory.GetClientAsync(providerCfg, modelCfg);
        return (client, endpoint, modelCfg, providerCfg);
    }

    // ---------------------------------------------------
    // Chat request building
    // ---------------------------------------------------
    private sealed record TextOverrides(bool Stream, int? MaxTokens, double? Temperature);

    private static TextOverrides ExtractTextOverrides(GenerationSettings? settings, bool fallbackStream)
    {
        var t = settings?.Text;
        return new TextOverrides(
            Stream: t?.Streaming ?? fallbackStream,
            MaxTokens: t?.MaxTokens,
            Temperature: t?.Temperature
        );
    }

    public ChatRequest BuildChatRequest(Session session, SessionMessage input, ChatGenerationArgs gen, string? sysReasoning)
    {
        var msgs = new List<ChatMessage>();

        var systemText = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(session.Instructions))
            systemText.AppendLine(session.Instructions);
        if (!string.IsNullOrWhiteSpace(sysReasoning))
            systemText.AppendLine(sysReasoning);

        if (systemText.Length > 0)
            msgs.Add(new ChatMessage { Role = AgenticRoles.SYSTEM, Content = systemText.ToString() });

        msgs.Add(new ChatMessage { Role = AgenticRoles.USER, Content = FlattenContentToText(input.Content) });

        var text = ExtractTextOverrides(gen.Settings, gen.Stream);

        return new ChatRequest
        {
            SessionId = session.Id,
            Provider = gen.Provider,
            Model = gen.Model,
            Stream = text.Stream,
            MaxTokens = text.MaxTokens,
            Temperature = text.Temperature,
            Messages = msgs
        };
    }

    public string? GetReasoningSystemText(ProviderModel? modelCfg, bool enableThinking)
    {
        if (modelCfg is null) return null;
        var text = enableThinking ? modelCfg.GetReasoningEnableAsString() : modelCfg.GetReasoningDisableAsString();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    // ---------------------------------------------------
    // Utilities
    // ---------------------------------------------------
    public string ExtractFinalText(ChatResponse res)
    {
        if (res is null || res.Choices is null || res.Choices.Count == 0) return string.Empty;
        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(res, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("choices", out var choices)) return string.Empty;
            var sb = new StringBuilder();
            foreach (var ch in choices.EnumerateArray())
            {
                if (ch.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("content", out var mcontent) &&
                    mcontent.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    sb.Append(mcontent.GetString());
                    continue;
                }

                if (ch.TryGetProperty("delta", out var delta) &&
                    delta.TryGetProperty("content", out var dcontent) &&
                    dcontent.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    sb.Append(dcontent.GetString());
                    continue;
                }

                if (ch.TryGetProperty("text", out var text) &&
                    text.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    sb.Append(text.GetString());
                    continue;
                }
            }
            return sb.ToString();
        }
        catch { return string.Empty; }
    }

    public string CleanTitle(string candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate)) return string.Empty;
        var withoutThink = System.Text.RegularExpressions.Regex.Replace(candidate, @"<\s*think\b[^>]*>.*?<\s*/\s*think\s*>", string.Empty, System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var collapsed = System.Text.RegularExpressions.Regex.Replace(withoutThink, @"\s+", " ").Trim();
        var clean = collapsed.Trim('"', '“', '”', '„', '«', '»', '\'', '’', '.', '!', '?', ':', ';', '…');
        if (clean.Length > 80) clean = clean[..80].TrimEnd();
        return clean;
    }

    public string FirstNWords(string input, int n)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var parts = input.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length <= n ? input.Trim() : string.Join(' ', parts.Take(n));
    }

    public string FlattenContentToText(IEnumerable<SessionMessageContent> parts)
    {
        if (parts == null) return string.Empty;
        var sb = new StringBuilder();
        foreach (var p in parts)
        {
            switch (p)
            {
                case SessionMessageTextContent t:
                    sb.AppendLine(t.Text);
                    break;
                case SessionMessageJsonContent j:
                    sb.AppendLine(j.Json);
                    break;
                case SessionMessageToolContent tool:
                    sb.AppendLine($"[tool:{tool.Function?.Name}] {System.Text.Json.JsonSerializer.Serialize(tool.Function?.Arguments)}");
                    break;
                case SessionMessageFileContent f:
                    sb.AppendLine($"[file:{f.Name}]({(f.Url ?? f.FileId?.ToString() ?? "inline")})");
                    break;
                case SessionMessageImageContent img:
                    sb.AppendLine($"[image:{img.Name}]({(img.Url ?? img.FileId?.ToString() ?? "inline")})");
                    break;
            }
        }
        return sb.ToString().Trim();
    }

    public ChatGenerationArgs BuildChatArgs(GenerationSettings? baseSettings, string provider, string? model, bool stream, bool enableThinking)
        => new ChatGenerationArgs(provider, model ?? string.Empty, baseSettings, enableThinking, stream);

    // ---------------------------------------------------
    // URL helpers
    // ---------------------------------------------------
    private static string NormalizePath(string? endpoint)
    {
        const string fallback = "chat/completions";
        if (string.IsNullOrWhiteSpace(endpoint)) return fallback;
        var ep = endpoint.Trim();
        if (ep.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            try { return new Uri(ep, UriKind.Absolute).AbsolutePath.Trim('/'); }
            catch { return fallback; }
        }
        return ep.Trim().TrimStart('/');
    }
    private static string NormalizeBase(string? baseUrl)
        => string.IsNullOrWhiteSpace(baseUrl) ? string.Empty : baseUrl.Trim().TrimEnd('/') + "/";
    private static string CombineUrl(string baseUrl, string relativePath)
        => string.IsNullOrEmpty(baseUrl) ? relativePath : $"{NormalizeBase(baseUrl)}{NormalizePath(relativePath)}";
}

// Kept in Domain layer (shared record)
public sealed record ChatGenerationArgs(
    string Provider,
    string Model,
    GenerationSettings? Settings,
    bool EnableThinking = false,
    bool Stream = true
);
