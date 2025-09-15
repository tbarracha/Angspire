using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;

namespace Genspire.Application.Modules.GenAI.Common.Completions.Services;
public static class ChatRequestExtensions
{
    public static ChatRequest CreateSimpleUserRequest(string prompt, string? provider = null, string? model = null)
    {
        return new ChatRequest
        {
            Model = model ?? "google/gemma-3n-e2b-it:free",
            Stream = false,
            Messages = new List<ChatMessage>
            {
                CreateUserMessage(prompt)
            }
        };
    }

    public static ChatMessage CreateUserMessage(string text)
    {
        return new ChatMessage
        {
            Role = AgenticRoles.USER,
            Content = text
        };
    }
}