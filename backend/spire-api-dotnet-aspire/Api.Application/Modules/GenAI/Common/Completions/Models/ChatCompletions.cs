using Genspire.Application.Modules.Agentic.Constants;
using System.ComponentModel;
using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.GenAI.Common.Completions.Models;

// --- Core Request/Response Models ---
public class ChatRequest
{
    [DefaultValue(null)]
    public Guid? SessionId { get; set; }

    [DefaultValue("OpenRouter")]
    public string? Provider { get; set; }

    [DefaultValue("google/gemma-3-4b-it:free")]
    public string? Model { get; set; }

    [DefaultValue(null)]
    public string? Prompt { get; set; }

    [DefaultValue("[{ \"role\": \"user\", \"content\": \"Tell me a joke\" }]")]
    public List<ChatMessage>? Messages { get; set; }

    [DefaultValue(null)]
    public object? Stop { get; set; }

    [DefaultValue(true)]
    public bool? Stream { get; set; }

    [DefaultValue(null)]
    public int? MaxTokens { get; set; }

    [DefaultValue(null)]
    public double? Temperature { get; set; }

    [DefaultValue(null)]
    public List<Tool>? Tools { get; set; }

    [DefaultValue(null)]
    public int? Seed { get; set; }

    [DefaultValue(null)]
    public double? TopP { get; set; }

    [DefaultValue(null)]
    public int? TopK { get; set; }

    [DefaultValue(null)]
    public double? FrequencyPenalty { get; set; }

    [DefaultValue(null)]
    public double? PresencePenalty { get; set; }

    [DefaultValue(null)]
    public double? RepetitionPenalty { get; set; }

    [DefaultValue(null)]
    public Prediction? Prediction { get; set; }

    [DefaultValue(null)]
    public string? User { get; set; }
}

public class ChatResponse
{
    public string Id { get; set; } = null!;
    public List<ChatChoice> Choices { get; set; } = new();
    public long Created { get; set; }
    public string Model { get; set; } = null!;
    public string Object { get; set; } = null!;
    public string? SystemFingerprint { get; set; }
    public ResponseUsage? Usage { get; set; }

    public static ChatChoice MapToDomain(RawChoice raw)
    {
        if (raw.Message != null)
        {
            return new NonStreamingChoice
            {
                Message = new ChatMessageResponse
                {
                    Role = raw.Message.Role,
                    Content = raw.Message.Content
                },
                FinishReason = raw.FinishReason,
                NativeFinishReason = raw.NativeFinishReason,
                Error = raw.Error
            };
        }
        else if (raw.Delta != null)
        {
            return new StreamingChoice
            {
                Delta = new ChatDelta
                {
                    Role = raw.Delta.Role,
                    Content = raw.Delta.Content
                },
                FinishReason = raw.FinishReason,
                NativeFinishReason = raw.NativeFinishReason,
                Error = raw.Error
            };
        }
        else if (raw.Text != null)
        {
            return new NonChatChoice
            {
                Text = raw.Text,
                FinishReason = raw.FinishReason,
                Error = raw.Error
            };
        }

        // handle fallback
        throw new NotSupportedException("Unknown choice format");
    }
}

// --- Choice Variants (Abstract Base Pattern) ---
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(NonChatChoice), "nonchat")]
[JsonDerivedType(typeof(NonStreamingChoice), "nonstreaming")]
[JsonDerivedType(typeof(StreamingChoice), "streaming")]
public abstract class ChatChoice
{
}

// NonChat (prompt/completions API, not chat API)
public class NonChatChoice : ChatChoice
{
    public string? FinishReason { get; set; }
    public string Text { get; set; } = null!;
    public ErrorResponse? Error { get; set; }
}

// NonStreaming (normal chat completion)
public class NonStreamingChoice : ChatChoice
{
    public string? FinishReason { get; set; }
    public string? NativeFinishReason { get; set; }
    public ChatMessageResponse Message { get; set; } = null!;
    public ErrorResponse? Error { get; set; }
}

// Streaming (used for streaming, "delta" is incremental)
public class StreamingChoice : ChatChoice
{
    public string? FinishReason { get; set; }
    public string? NativeFinishReason { get; set; }
    public ChatDelta Delta { get; set; } = null!;
    public ErrorResponse? Error { get; set; }
}

// --- Supporting Models ---
public class ChatMessage
{
    [DefaultValue("user")]
    public string Role { get; set; } = AgenticRoles.USER;

    [DefaultValue("Tell me a joke")]
    public object Content { get; set; } = null!;
    public string? Name { get; set; }
    public string? ToolCallId { get; set; }
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(TextContent), "text")]
[JsonDerivedType(typeof(ImageContentPart), "image_url")]
public abstract class ContentPart
{
}

public class TextContent : ContentPart
{
    public string Text { get; set; } = null!;
}

public class ImageContentPart : ContentPart
{
    public ImageUrlDetail ImageUrl { get; set; } = null!;
}

public class ImageUrlDetail
{
    public string Url { get; set; } = null!;
    public string? Detail { get; set; }
}

public class RawChatResponse
{
    public string Id { get; set; }
    public List<RawChoice> Choices { get; set; }
    public long Created { get; set; }
    public string Model { get; set; }
    public string Object { get; set; }
    public string? SystemFingerprint { get; set; }
    public ResponseUsage? Usage { get; set; }
}

public class RawChoice
{
    public string? FinishReason { get; set; }
    public string? NativeFinishReason { get; set; }
    public RawDelta? Delta { get; set; }
    public RawMessage? Message { get; set; }
    public string? Text { get; set; }
    public ErrorResponse? Error { get; set; }
}

public class RawDelta
{
    public string? Role { get; set; }
    public string? Content { get; set; }
}

public class RawMessage
{
    public string? Role { get; set; }
    public string? Content { get; set; }
}

public class FunctionDescription
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public object Parameters { get; set; } = null!;
}

public class Tool
{
    public string Type { get; set; } = null!;
    public FunctionDescription Function { get; set; } = null!;
}

public class Prediction
{
    [DefaultValue(null)]
    public string Type { get; set; } = null!;

    [DefaultValue(null)]
    public string Content { get; set; } = null!;
}

public class ChatMessageResponse
{
    public string? Content { get; set; }
    public string Role { get; set; } = null!;
    public List<ToolCall>? ToolCalls { get; set; }
}

public class ChatDelta
{
    public string? Content { get; set; }
    public string? Role { get; set; }
    public List<ToolCall>? ToolCalls { get; set; }
}

public class ToolCall
{
    public string Id { get; set; } = null!;
    public string Type { get; set; } = null!;
    public FunctionCall Function { get; set; } = null!;
}

public class FunctionCall
{
    public string Name { get; set; } = null!;
    public object Arguments { get; set; } = null!;
}

public class ResponseUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; set; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; set; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; set; }
}

public class ErrorResponse
{
    public int Code { get; set; }
    public string Message { get; set; } = null!;
    public Dictionary<string, object>? Metadata { get; set; }
}