// File: OllamaClient.cs
using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.GenAI.Client.AiClients;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.GenAI.Client.Ollama;
public class OllamaClient : AiClient
{
    public override string? Provider => "Ollama";

    /// <summary>
    /// Toggle OllamaClient-specific diagnostics (separate from BaseAIClient and AiClient toggles).
    /// True by default to aid provider-specific troubleshooting without enabling parent logs.
    /// </summary>
    protected const bool LogOllamaDiagnostics = false;
    public OllamaClient(string baseUrl, // ⚠ keep default as before to avoid Hot Reload param-change error
    string endpointPath = "chat/completions", string? apiKey = null, HttpClient? httpClient = null) : base(baseUrl, endpointPath, apiKey, httpClient)
    {
        if (LogOllamaDiagnostics)
            Console.WriteLine($"[OllamaClient INFO] Ctor: base={baseUrl} endpointPath='{endpointPath}'");
    }

    protected override string ResolveEndpoint(string? endpoint)
    {
        var resolved = base.ResolveEndpoint(endpoint);
        if (LogOllamaDiagnostics)
            Console.WriteLine($"[OllamaClient INFO] ResolveEndpoint: input='{endpoint ?? "<null>"}' → '{resolved}'");
        return resolved;
    }

    /// <summary>
    /// Build a native Ollama payload: { model, messages:[{role,content}], stream }
    /// </summary>
    protected override object BuildChatPayload(ChatRequest request)
    {
        var messages = request.Messages?.Select(m => (object)new { role = m.Role, content = m.Content }).ToList() ?? new List<object>();
        var payload = new
        {
            model = request.Model,
            messages,
            stream = request.Stream ?? true
            // Add other knobs (temperature, top_p, etc.) when you expose them in ChatRequest
        };
        if (LogOllamaDiagnostics)
            Console.WriteLine($"[OllamaClient INFO] BuildChatPayload: model='{request.Model}' msgs={messages.Count} stream={payload.stream}");
        return payload;
    }

    /// <summary>
    /// Native streaming override: consume Ollama NDJSON lines and yield normalized ChatResponse chunks.
    /// Final frame DOES NOT include the full content (only finish metadata).
    /// </summary>
    public override async IAsyncEnumerable<ChatResponse> StreamChatCompletionAsync(ChatRequest request, string endpoint, string provider = "Ollama", [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        request.Stream = true;
        var id = Guid.NewGuid().ToString();
        var created = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var model = request.Model ?? string.Empty;
        var full = new System.Text.StringBuilder();
        string? finishReason = null;
        var normalizedEndpoint = ResolveEndpoint(endpoint);
        var payload = BuildChatPayload(request);
        if (LogOllamaDiagnostics)
            Console.WriteLine($"[OllamaClient INFO] StreamChat: POST(stream) '{normalizedEndpoint}'");
        await foreach (var line in PostStreamAsync(normalizedEndpoint, payload, cancellationToken))
        {
            string? tokenToEmit = null;
            bool parsedDone = false;
            string? parsedDoneReason = null;
            try
            {
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;
                // done:true line (stats)
                if (root.TryGetProperty("done", out var doneEl) && doneEl.ValueKind == JsonValueKind.True)
                {
                    parsedDone = true;
                    if (root.TryGetProperty("done_reason", out var dr) && dr.ValueKind == JsonValueKind.String)
                        parsedDoneReason = dr.GetString();
                }
                else if (root.TryGetProperty("message", out var msgEl) && msgEl.ValueKind == JsonValueKind.Object && msgEl.TryGetProperty("content", out var contentEl) && contentEl.ValueKind == JsonValueKind.String)
                {
                    tokenToEmit = contentEl.GetString();
                }
            }
            catch (Exception ex)
            {
                if (LogOllamaDiagnostics)
                    Console.WriteLine($"[OllamaClient WARN] StreamChat: parse failed: {ex.Message}");
            }

            if (parsedDone)
            {
                finishReason = parsedDoneReason;
                if (LogOllamaDiagnostics)
                    Console.WriteLine($"[OllamaClient INFO] StreamChat: done=true reason='{finishReason ?? ""}'");
                continue; // no token to emit on final stats line
            }

            if (!string.IsNullOrEmpty(tokenToEmit))
            {
                full.Append(tokenToEmit);
                if (LogOllamaDiagnostics)
                    Console.WriteLine($"[OllamaClient INFO] StreamChat: TOKEN +{tokenToEmit.Length} total={full.Length}");
                yield return new ChatResponse
                {
                    Id = id,
                    Created = created,
                    Model = model,
                    Object = "chat.completion.chunk",
                    Choices = new List<ChatChoice>
                    {
                        new StreamingChoice
                        {
                            Delta = new ChatDelta
                            {
                                Role = AgenticRoles.ASSISTANT,
                                Content = tokenToEmit
                            }
                        }
                    }
                };
            }
        }

        if (LogOllamaDiagnostics)
            Console.WriteLine($"[OllamaClient INFO] StreamChat: FINAL totalChars={full.Length}");
        // IMPORTANT: Do NOT resend the full content in the final frame.
        // Emit only finish metadata; downstream already has all chunks.
        yield return new ChatResponse
        {
            Id = id,
            Created = created,
            Model = model,
            Object = "chat.completion",
            Choices = new List<ChatChoice>
            {
                new StreamingChoice
                {
                    FinishReason = finishReason,
                    NativeFinishReason = finishReason,
                    Delta = new ChatDelta
                    {
                        Role = AgenticRoles.ASSISTANT,
                        Content = null
                    }
                }
            }
        };
    }

    // Non-stream final parse still supports native shapes
    protected override RawChatResponse ParseRawChatResponse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.TryGetProperty("choices", out _))
        {
            if (LogOllamaDiagnostics)
                Console.WriteLine($"[OllamaClient INFO] ParseRawChatResponse: OpenAI-compatible branch");
            var openAi = JsonSerializer.Deserialize<RawChatResponse>(json, _jsonOptions);
            if (openAi?.Choices is null)
            {
                if (LogOllamaDiagnostics)
                    Console.WriteLine($"[OllamaClient ERROR] ParseRawChatResponse: choices missing after OpenAI branch");
                throw new Exception("OpenAI-compatible response missing 'choices'.");
            }

            return openAi;
        }

        if (root.TryGetProperty("message", out _))
        {
            if (LogOllamaDiagnostics)
                Console.WriteLine($"[OllamaClient INFO] ParseRawChatResponse: Native Ollama branch");
            var native = JsonSerializer.Deserialize<OllamaNativeChatResponse>(json, _jsonOptions) ?? throw new Exception("Failed to deserialize native Ollama chat response.");
            var created = native.CreatedAt?.ToUnixTimeSeconds() ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return new RawChatResponse
            {
                Id = $"ollama-{created}-{Guid.NewGuid():N}",
                Created = created,
                Model = native.Model ?? string.Empty,
                Object = "chat.completion",
                Choices = new List<RawChoice>
                {
                    new RawChoice
                    {
                        FinishReason = native.DoneReason,
                        NativeFinishReason = native.DoneReason,
                        Message = new RawMessage
                        {
                            Role = native.Message?.Role,
                            Content = native.Message?.Content
                        }
                    }
                }
            };
        }

        if (LogOllamaDiagnostics)
            Console.WriteLine($"[OllamaClient ERROR] ParseRawChatResponse: Unknown shape (no 'choices' / 'message')");
        throw new Exception("Unknown Ollama response shape. Expected 'choices' or 'message'.");
    }

    // ---- minimal native DTOs for non-stream adaptation ----
    private sealed class OllamaNativeChatResponse
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("created_at")]
        public DateTimeOffset? CreatedAt { get; set; }

        [JsonPropertyName("message")]
        public OllamaNativeMessage? Message { get; set; }

        [JsonPropertyName("done_reason")]
        public string? DoneReason { get; set; }

        [JsonPropertyName("done")]
        public bool? Done { get; set; }
    }

    private sealed class OllamaNativeMessage
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }
}