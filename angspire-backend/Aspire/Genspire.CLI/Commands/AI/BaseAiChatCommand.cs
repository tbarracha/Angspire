using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using Genspire.Application.Modules.GenAI.Providers.Domain.Services;
using Genspire.Application.Modules.Identity.Tags.Domain.Defaults;
using Genspire.Application.Modules.Identity.Tags.Domain.Models;
using Microsoft.Extensions.DependencyInjection;
using SpireCore.Commands;

namespace Genspire.CLI.Commands.AI;

public abstract class BaseAiChatCommand : BaseCommand
{
    protected readonly ProviderConfigService _providerService;

    protected List<Provider> _providerConfigs = new();
    protected List<Provider> _enabledProviders = new();
    protected Provider _selectedProviderConfig = null!;
    protected Tag _selectedTag = null!;
    protected ProviderModel _selectedModelConfig = null!;

    protected object ChatService { get; set; }  // Replace 'object' with your actual service type

    public BaseAiChatCommand(IServiceProvider serviceProvider)
    {
        _providerService = serviceProvider.GetRequiredService<ProviderConfigService>();
    }

    public override CommandResult Execute(CommandContext context)
    {
        // Change to async entry point
        ExecuteAsync(context).GetAwaiter().GetResult();
        return CommandResult.Success();
    }

    public virtual async Task ExecuteAsync(CommandContext context)
    {
        await LoadProviderConfigsAsync();
        ListEnabledProviders();
        SelectProvider();
        SelectTag();
        SelectModel();
        InitializeChatService();
        PrintStartupInfo();
        RunChatLoop();
    }

    protected async Task LoadProviderConfigsAsync()
    {
        _providerConfigs = await _providerService.GetAllProvidersWithModelsAsync();

        // Only show enabled providers with at least one text or reasoning tag
        var relevantTagIds = new HashSet<Guid>
        {
            DefaultTags.AiGeneration.Text.Id,
            DefaultTags.AiGeneration.Reasoning.Id
        };

        _enabledProviders = _providerConfigs
            .Where(p =>
                p.Enabled &&
                p.Models.Any(m =>
                    m.SupportedTagIds.Any(id => relevantTagIds.Contains(id))))
            .ToList();

        if (!_enabledProviders.Any())
            throw new InvalidOperationException("No enabled AI providers with chat models found.");
    }

    protected void ListEnabledProviders()
    {
        Console.WriteLine("Available AI Providers:");
        for (int i = 0; i < _enabledProviders.Count; i++)
        {
            var display = _enabledProviders[i].DisplayName ?? _enabledProviders[i].Name ?? $"Provider {i + 1}";
            var desc = _enabledProviders[i].Description ?? "";
            Console.WriteLine($"  [{i + 1}] {display}{(string.IsNullOrWhiteSpace(desc) ? "" : $" - {desc}")}");
        }
    }

    protected void SelectProvider()
    {
        Console.Write("Choose a provider [1]: ");
        var providerInput = Console.ReadLine();
        int providerIndex = 0;
        if (!string.IsNullOrWhiteSpace(providerInput) && int.TryParse(providerInput, out int parsedIndex))
            providerIndex = parsedIndex - 1;
        if (providerIndex < 0 || providerIndex >= _enabledProviders.Count)
            providerIndex = 0;

        _selectedProviderConfig = _enabledProviders[providerIndex];
    }

    protected void SelectTag()
    {
        // Gather all supported tags from all models
        var allTagIds = _selectedProviderConfig.Models
            .SelectMany(m => m.SupportedTagIds)
            .Distinct()
            .ToList();

        // Map to Tag objects (prefer default tags for known ones)
        var tagMap = DefaultTags.All.ToDictionary(t => t.Id, t => t);
        var allTags = allTagIds
            .Select(id => tagMap.TryGetValue(id, out var tag)
                ? tag
                : new Tag { Id = id, DisplayName = id.ToString() })
            .ToList();

        // Prefer Text as default
        var defaultTagIndex = allTags.FindIndex(t => t.Id == DefaultTags.AiGeneration.Text.Id);
        if (defaultTagIndex < 0) defaultTagIndex = 0;

        _selectedTag = allTags[defaultTagIndex];

        if (allTags.Count > 1)
        {
            Console.WriteLine("\nSupported generation types:");
            for (int i = 0; i < allTags.Count; i++)
                Console.WriteLine($"  [{i + 1}] {allTags[i].DisplayName}");

            Console.Write($"Choose a type [1]: ");
            var typeInput = Console.ReadLine();
            int typeIndex = defaultTagIndex;
            if (!string.IsNullOrWhiteSpace(typeInput) && int.TryParse(typeInput, out int parsedTypeIndex))
                typeIndex = parsedTypeIndex - 1;
            if (typeIndex < 0 || typeIndex >= allTags.Count)
                typeIndex = defaultTagIndex;
            _selectedTag = allTags[typeIndex];
        }
    }

    protected void SelectModel()
    {
        var modelsForTag = _selectedProviderConfig.Models
            .Where(m => m.SupportedTagIds.Contains(_selectedTag.Id))
            .ToList();

        if (!modelsForTag.Any())
            throw new InvalidOperationException($"No models found for provider '{_selectedProviderConfig.DisplayName}', tag '{_selectedTag.DisplayName}'.");

        _selectedModelConfig = modelsForTag[0];
        if (modelsForTag.Count > 1)
        {
            Console.WriteLine($"\nAvailable models for '{_selectedProviderConfig.DisplayName}' [{_selectedTag.DisplayName}]:");
            for (int i = 0; i < modelsForTag.Count; i++)
                Console.WriteLine($"  [{i + 1}] {modelsForTag[i].Name}");
            Console.Write("Choose a model [1]: ");
            var modelInput = Console.ReadLine();
            int modelIndex = 0;
            if (!string.IsNullOrWhiteSpace(modelInput) && int.TryParse(modelInput, out int parsedModelIndex))
                modelIndex = parsedModelIndex - 1;
            if (modelIndex < 0 || modelIndex >= modelsForTag.Count)
                modelIndex = 0;
            _selectedModelConfig = modelsForTag[modelIndex];
        }
    }

    protected virtual void InitializeChatService()
    {
        // Override in derived class to set ChatService
    }

    protected virtual void PrintStartupInfo()
    {
        Console.WriteLine($"\nAI Console (provider: {_selectedProviderConfig.DisplayName}, model: {_selectedModelConfig.Name}, tag: {_selectedTag.DisplayName})");
        Console.WriteLine("(type '/exit', '/bye', or 'exit' to quit):\n");
    }

    protected abstract void RunChatLoop();

    protected bool AskIfStreaming()
    {
        Console.Write("Do you want streaming responses? (Y/n): ");
        var streamingInput = Console.ReadLine();
        Console.WriteLine();

        // Treat empty as 'yes' (true)
        if (string.IsNullOrWhiteSpace(streamingInput)) return true;
        var input = streamingInput.Trim().ToLower();
        return input == "y" || input == "yes";
    }

    protected bool CheckForExitInput(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return true;

        var normalizedInput = input.Trim().ToLowerInvariant();
        return normalizedInput == "exit" ||
               normalizedInput == "/exit" ||
               normalizedInput == "/bye";
    }

    protected virtual void RenderAssistantStreamingChunk(string contentChunk, bool isFirstChunk)
    {
        if (isFirstChunk)
            Console.Write("Assistant: "); // Print label only at the start

        Console.Write(contentChunk);       // Print chunk as it's received
    }

    protected bool AskSendTestMessage()
    {
        Console.Write("Send a test message? (Y/n): ");
        var input = Console.ReadLine();
        Console.WriteLine();
        if (string.IsNullOrWhiteSpace(input)) return true;
        input = input.Trim().ToLower();
        return input == "y" || input == "yes";
    }

    protected string GetDefaultTestMessage()
    {
        return "/no_think Hello! Tell me a two line joke";
    }
}
