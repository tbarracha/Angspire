// File: ChatRequestMapper.cs
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using System.Text.Json;

namespace Genspire.Application.Modules.GenAI.Client.AiClients;
/// <summary>
/// Maps our domain ChatRequest → OpenAI-compatible /v1/chat/completions payload.
/// Kept partial so providers can extend (tools, multimodal, reasoning, etc.).
/// </summary>
public static partial class ChatRequestMapper
{
    /// <summary>
    /// Produces an OpenAI-compatible payload:
    /// {
    ///   model, messages: [{role, content}], stream, temperature, max_tokens, stop, user, tools?
    /// }
    /// Notes:
    /// - content is flattened to a single string (Ollama shim expects string, not parts[])
    /// - if Messages is empty and Prompt is provided, creates a single user message from Prompt
    /// </summary>
    public static object ToOpenAiCompatibleChatPayload(ChatRequest req)
    {
        var model = req.Model ?? string.Empty;
        var messages = BuildMessages(req);
        return new
        {
            model,
            messages,
            stream = req.Stream ?? false,
            temperature = req.Temperature,
            max_tokens = req.MaxTokens,
            stop = req.Stop,
            user = req.User,
            // Keep tools passthrough for providers that accept it; Ollama will ignore.
            tools = req.Tools
        };
    }

    // --- helpers -------------------------------------------------------------
    private static IEnumerable<object> BuildMessages(ChatRequest req)
    {
        if (req.Messages is { Count: > 0 })
            return req.Messages.Select(m => new { role = m.Role, content = FlattenContent(m.Content) });
        // Fallback: Prompt → single user message
        if (!string.IsNullOrWhiteSpace(req.Prompt))
            return new[]
            {
                new
                {
                    role = "user",
                    content = req.Prompt
                }
            };
        // Defensive: return empty list if nothing present
        return Array.Empty<object>();
    }

    /// <summary>
    /// Flattens various "content" shapes into a plain string:
    /// - string → as-is
    /// - IEnumerable&lt;ContentPart&gt; → join all text parts with blank lines
    /// - JsonElement → supports {"type":"text","text":...} arrays and raw strings
    /// - IEnumerable&lt;object&gt; with { type, text } → join texts
    /// Everything else → JSON stringified (last resort).
    /// </summary>
    private static string FlattenContent(object content)
    {
        if (content is null)
            return string.Empty;
        // 1) Already a string
        if (content is string s)
            return s;
        // 2) Strongly-typed parts
        if (content is IEnumerable<ContentPart> partsStrong)
            return string.Join("\n\n", partsStrong.Select(PartToText).Where(t => !string.IsNullOrWhiteSpace(t)));
        // 3) JSON element (when deserialized dynamically)
        if (content is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.String)
                return je.GetString() ?? string.Empty;
            if (je.ValueKind == JsonValueKind.Array)
            {
                var texts = new List<string>();
                foreach (var el in je.EnumerateArray())
                {
                    // Expect shape: { "type": "text", "text": "..." }
                    if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String && t.GetString()?.Equals("text", StringComparison.OrdinalIgnoreCase) == true && el.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                    {
                        var text = textProp.GetString();
                        if (!string.IsNullOrWhiteSpace(text))
                            texts.Add(text!);
                    }
                }

                if (texts.Count > 0)
                    return string.Join("\n\n", texts);
            }

            // Fallback: stringify unknown JSON shapes
            return je.ToString() ?? string.Empty;
        }

        // 4) Loosely-typed list of objects with {type, text}
        if (content is IEnumerable<object> objList)
        {
            var texts = new List<string>();
            foreach (var item in objList)
            {
                var text = TryReadAnonymousTextPart(item) ?? item?.ToString();
                if (!string.IsNullOrWhiteSpace(text))
                    texts.Add(text!);
            }

            if (texts.Count > 0)
                return string.Join("\n\n", texts);
        }

        // 5) Last resort
        return content.ToString() ?? string.Empty;
    }

    private static string? PartToText(ContentPart p)
    {
        // We only flatten text for now (keeps Ollama happy).
        // If you want multimodal: extend this partial with image → "[image]" or similar.
        if (p is TextContent tc)
            return tc.Text;
        if (p is ImageContentPart ic)
        {
            // Non-breaking: hint text for images. Customize or remove as you wish.
            var url = ic.ImageUrl?.Url;
            return !string.IsNullOrWhiteSpace(url) ? $"[image: {url}]" : null;
        }

        return null;
    }

    // Tries to read { type: "text", text: "..." } from anonymous objects
    private static string? TryReadAnonymousTextPart(object? item)
    {
        if (item is null)
            return null;
        var typeProp = item.GetType().GetProperty("type") ?? item.GetType().GetProperty("Type");
        var textProp = item.GetType().GetProperty("text") ?? item.GetType().GetProperty("Text");
        var typeVal = typeProp?.GetValue(item) as string;
        var textVal = textProp?.GetValue(item) as string;
        if (!string.IsNullOrWhiteSpace(typeVal) && typeVal.Equals("text", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(textVal))
        {
            return textVal;
        }

        return null;
    }
}