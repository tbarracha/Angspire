// File: AiClient.cs
using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;

namespace Genspire.Application.Modules.GenAI.Client.AiClients;
public abstract partial class AiClient : BaseAIClient
{
    /// <summary>
    /// Toggle AiClient-specific diagnostics (separate from BaseAIClient.LogDiagnostics).
    /// Use this to avoid interleaving logs from parent/child.
    /// </summary>
    protected const bool LogAiClientDiagnostics = false;
    protected virtual string ChatCompletionsEndpoint => "v1/chat/completions";

    protected virtual string ResolveEndpoint(string? endpoint)
    {
        if (!string.IsNullOrWhiteSpace(endpoint) && Uri.TryCreate(endpoint, UriKind.Absolute, out _))
        {
            if (LogAiClientDiagnostics)
                Console.WriteLine($"[AiClient INFO] ResolveEndpoint: absolute input → '{endpoint!.Trim()}'");
            return endpoint!.Trim();
        }

        var ep = string.IsNullOrWhiteSpace(endpoint) ? ChatCompletionsEndpoint : endpoint!;
        var resolved = ep.Trim().TrimStart('/');
        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] ResolveEndpoint: relative/default input='{endpoint ?? "<null>"}' → '{resolved}'");
        return resolved;
    }

    protected virtual RawChatResponse ParseRawChatResponse(string json)
    {
        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] ParseRawChatResponse: attempting OpenAI-compatible parse");
        var openAi = JsonSerializer.Deserialize<RawChatResponse>(json, _jsonOptions);
        if (openAi?.Choices is null)
        {
            if (LogAiClientDiagnostics)
                Console.WriteLine($"[AiClient ERROR] ParseRawChatResponse: no 'choices' in payload");
            throw new Exception("Response did not contain 'choices'. Ensure provider returns OpenAI-compatible payload or override ParseRawChatResponse.");
        }

        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] ParseRawChatResponse: choices={openAi.Choices?.Count}");
        return openAi;
    }

    protected virtual object BuildChatPayload(ChatRequest request)
    {
        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] BuildChatPayload: provider='{request.Provider}' model='{request.Model}' stream={request.Stream}");
        return ChatRequestMapper.ToOpenAiCompatibleChatPayload(request);
    }

    public virtual async Task<ChatResponse> CreateChatCompletionAsync(ChatRequest request, string endpoint, string provider = "OpenAI", CancellationToken ct = default)
    {
        var normalizedEndpoint = ResolveEndpoint(endpoint);
        var payload = BuildChatPayload(request);
        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] CreateChatCompletionAsync: POST '{normalizedEndpoint}' provider='{provider}'");
        var response = await PostAsync(normalizedEndpoint, payload, ct);
        var responseJson = await response.Content.ReadAsStringAsync(ct);
        if (LogAiClientDiagnostics)
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AiClient INFO] Response JSON:");
            Console.WriteLine(responseJson);
            Console.ResetColor();
        }
        else
        {
            PrintResponse(nameof(AiClient), responseJson);
        }

        var rawResponse = ParseRawChatResponse(responseJson);
        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] CreateChatCompletionAsync: mapped choices={rawResponse.Choices?.Count}");
        return new ChatResponse
        {
            Id = rawResponse.Id,
            Choices = rawResponse.Choices.Select(ChatResponse.MapToDomain).ToList(),
            Created = rawResponse.Created,
            Model = rawResponse.Model,
            Object = rawResponse.Object,
            SystemFingerprint = rawResponse.SystemFingerprint,
            Usage = rawResponse.Usage,
        };
    }

    public virtual async IAsyncEnumerable<ChatResponse> StreamChatCompletionAsync(ChatRequest request, string endpoint, string provider = "OpenAI", [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        request.Stream = true;
        var fullContent = new StringBuilder(); // canonical accumulator of assistant text
        var id = Guid.NewGuid().ToString();
        var created = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var model = request.Model ?? string.Empty;
        ResponseUsage? usage = null;
        string? finishReason = null;
        string? nativeFinishReason = null;
        var normalizedEndpoint = ResolveEndpoint(endpoint);
        var payload = BuildChatPayload(request);
        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] StreamChatCompletionAsync: POST(stream) '{normalizedEndpoint}' provider='{provider}'");
        await foreach (var line in PostStreamAsync(normalizedEndpoint, payload, cancellationToken))
        {
            if (LogAiClientDiagnostics)
                Console.WriteLine($"[AiClient INFO] StreamChat: line len={line.Length} startsWithData={line.StartsWith("data:", StringComparison.OrdinalIgnoreCase)}");
            // Provider-specific extraction (may be a true delta OR a cumulative-so-far string)
            var token = AiClientExtensions.ParseChatStreamContentForProvider(provider, line);
            if (!string.IsNullOrEmpty(token) && LogAiClientDiagnostics)
                Console.WriteLine($"[AiClient INFO] StreamChat: RAW TOKEN='{token.Replace("\r", "\\r").Replace("\n", "\\n")}'");
            // Parse optional metadata (usage / finish reasons) if present on this SSE frame
            try
            {
                if (line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                {
                    var data = line[5..].Trim();
                    if (!string.IsNullOrWhiteSpace(data) && data != "[DONE]")
                    {
                        using var doc = JsonDocument.Parse(data);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("usage", out var usageJson))
                        {
                            usage = usageJson.Deserialize<ResponseUsage>();
                            if (LogAiClientDiagnostics)
                                Console.WriteLine($"[AiClient INFO] StreamChat: usage parsed");
                        }

                        if (root.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                        {
                            var choice = choices[0];
                            if (choice.TryGetProperty("finish_reason", out var finish))
                            {
                                finishReason = finish.GetString();
                                if (!string.IsNullOrEmpty(finishReason) && LogAiClientDiagnostics)
                                    Console.WriteLine($"[AiClient INFO] StreamChat: finishReason='{finishReason}'");
                            }

                            if (choice.TryGetProperty("native_finish_reason", out var nfinish))
                            {
                                nativeFinishReason = nfinish.GetString();
                                if (!string.IsNullOrEmpty(nativeFinishReason) && LogAiClientDiagnostics)
                                    Console.WriteLine($"[AiClient INFO] StreamChat: nativeFinishReason='{nativeFinishReason}'");
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                if (LogAiClientDiagnostics)
                    Console.WriteLine($"[AiClient WARN] StreamChat: metadata parse failed: {ex.Message}");
            }

            // === Normalize to incremental delta ===
            if (!string.IsNullOrEmpty(token))
            {
                var current = fullContent.ToString();
                // If provider sends cumulative "so far" content each time,
                // strip the already-seen prefix so we only emit the new suffix.
                string emit;
                if (token.StartsWith(current, StringComparison.Ordinal))
                {
                    emit = token.Substring(current.Length);
                }
                else if (current.Length > 0 && current.EndsWith(token, StringComparison.Ordinal))
                {
                    // Defensive: sometimes providers resend the last chunk verbatim
                    emit = string.Empty;
                }
                else
                {
                    // Looks like a true incremental delta
                    emit = token;
                }

                if (emit.Length > 0)
                {
                    fullContent.Append(emit);
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
                                    Content = emit
                                }
                            }
                        }
                    };
                }
            }
        }

        if (LogAiClientDiagnostics)
            Console.WriteLine($"[AiClient INFO] StreamChat: FINAL totalChars={fullContent.Length}");
        // IMPORTANT: Do NOT resend the full content in the final frame.
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
                    NativeFinishReason = nativeFinishReason,
                    // No final Delta.Content — downstream already has all chunks
                    Delta = new ChatDelta
                    {
                        Role = AgenticRoles.ASSISTANT,
                        Content = null
                    }
                }
            },
            Usage = usage
        };
    }
}