using Genspire.Application.Modules.GenAI.Client.Factory;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using Genspire.Application.Modules.GenAI.Common.Completions.Services;
using Genspire.Application.Modules.GenAI.Providers.Domain.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Genspire.CLI.Commands.AI;

public class ChatbotCommand : BaseAiChatCommand
{
    private readonly List<ChatMessage> _messages = new();
    private readonly IAIClientFactory _aiClientFactory;
    private readonly ProviderConfigService _providerConfigService;
    private ChatCompletionService? _chatService;

    public ChatbotCommand(IServiceProvider serviceProvider)
        : base(serviceProvider)
    {
        _aiClientFactory = serviceProvider.GetRequiredService<IAIClientFactory>();
        _providerConfigService = serviceProvider.GetRequiredService<ProviderConfigService>();
    }

    protected override void InitializeChatService()
    {
        // Service is now built at runtime, not pre-baked with a ChatCompletionsClient
        _chatService = new ChatCompletionService(_providerConfigService, _aiClientFactory);
        ChatService = _chatService;
    }

    private async Task SendMessageAsync(ChatCompletionService chatService, string userMessage, bool useStreaming)
    {
        _messages.Add(new ChatMessage { Role = "user", Content = userMessage });

        var request = new ChatRequest
        {
            Model = _selectedModelConfig.Name,
            Provider = _selectedProviderConfig.Name,
            Messages = new List<ChatMessage>(_messages),
            Stream = useStreaming
        };

        try
        {
            if (useStreaming)
            {
                Console.WriteLine();
                var streamedText = new System.Text.StringBuilder();
                var isFirstChunk = true;

                await foreach (var chunk in chatService.StreamCompletionAsync(request, CancellationToken.None))
                {
                    // Each chunk is a ChatResponse, not a JSON string.
                    var assistantMessage = ExtractAssistantMessage(chunk);
                    if (!string.IsNullOrWhiteSpace(assistantMessage))
                    {
                        RenderAssistantStreamingChunk(assistantMessage, isFirstChunk);
                        isFirstChunk = false;
                        streamedText.Append(assistantMessage);
                    }
                }

                Console.WriteLine();

                var messageText = streamedText.ToString();
                if (!string.IsNullOrWhiteSpace(messageText))
                    _messages.Add(new ChatMessage { Role = "assistant", Content = messageText });
            }
            else
            {
                var response = await chatService.CompleteAsync(request);
                var assistantMessage = ExtractAssistantMessage(response);

                if (!string.IsNullOrWhiteSpace(assistantMessage))
                {
                    Console.WriteLine();
                    RenderAssistantStreamingChunk(assistantMessage, true);
                    Console.WriteLine();
                    _messages.Add(new ChatMessage { Role = "assistant", Content = assistantMessage });
                }
                else
                {
                    Console.WriteLine("No assistant response received.");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
    }

    private async Task AskForTestMessageAsync(ChatCompletionService chatService, bool useStreaming)
    {
        Console.Write("Send a test message? (Y/n): ");
        var input = Console.ReadLine();
        Console.WriteLine();
        if (!string.IsNullOrWhiteSpace(input) && input.Trim().ToLower() != "y" && input.Trim().ToLower() != "yes")
            return;

        var testMsg = "/no_think Hello! Tell me a two line joke";
        await SendMessageAsync(chatService, testMsg, useStreaming);
    }

    protected override async void RunChatLoop()
    {
        var chatService = (ChatCompletionService)ChatService;
        var useStreaming = AskIfStreaming();

        await AskForTestMessageAsync(chatService, useStreaming);

        while (true)
        {
            Console.Write("> ");
            var input = Console.ReadLine();

            if (string.IsNullOrWhiteSpace(input))
                continue;

            // Check for exit (handles empty as exit if you want; otherwise remove that logic from CheckForExitInput)
            if (CheckForExitInput(input))
                break;

            // Only send non-empty messages!
            if (!string.IsNullOrWhiteSpace(input))
                await SendMessageAsync(chatService, input, useStreaming);
        }
    }

    private static string ExtractAssistantMessage(ChatResponse response)
    {
        if (response.Choices == null || response.Choices.Count == 0)
            return string.Empty;

        // For streaming, OpenAI's ChatResponse.Choices.Delta.Content is used
        foreach (var choice in response.Choices)
        {
            // Streaming chunk
            if (choice is StreamingChoice streaming && streaming.Delta?.Content != null)
                return streaming.Delta.Content;

            // Non-streaming (complete) chunk
            if (choice is NonStreamingChoice nonStreaming && nonStreaming.Message?.Content != null)
                return nonStreaming.Message.Content;
        }
        return string.Empty;
    }
}
