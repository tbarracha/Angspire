using Genspire.Application.Modules.Identity.Tags.Domain.Defaults;

namespace Genspire.Application.Modules.GenAI.Providers.Domain.Models;
public static class DefaultProviderConfigs
{
    public static readonly Provider Ollama = new Provider
    {
        Name = "Ollama",
        DisplayName = "Ollama",
        Description = "Local OpenAI-compatible LLM server",
        ImageUrl = "https://ollama.com/public/ollama.png",
        SupportedTagIds = new List<Guid>
        {
            DefaultTags.AiGeneration.Text.Id,
            DefaultTags.AiGeneration.Reasoning.Id
        },
        SupportedTagNames = new List<string>
        {
            DefaultTags.AiGeneration.Text.DisplayName,
            DefaultTags.AiGeneration.Reasoning.DisplayName,
            DefaultTags.AiGeneration.Embedding.DisplayName
        },
        ApiBaseUrl = "http://localhost:11434/api",
        Enabled = true,
        Models = new List<ProviderModel>
        {
            new ProviderModel
            {
                ProviderName = "Ollama",
                Name = "qwen3:14b",
                DisplayName = "Qwen3 14B",
                ImageUrl = "https://assets.alicdn.com/g/qwenweb/qwen-webui-fe/0.0.173/static/qwen_icon_light_84.png",
                SupportedTagIds = new List<Guid>
                {
                    DefaultTags.AiGeneration.Text.Id,
                    DefaultTags.AiGeneration.Reasoning.Id
                },
                SupportedTagNames = new List<string>
                {
                    DefaultTags.AiGeneration.Text.DisplayName,
                    DefaultTags.AiGeneration.Reasoning.DisplayName
                },
                ApiKey = null,
                ApiEndpoint = "chat",
                ReasoningEnable = "/think",
                ReasoningDisable = "/nothink",
                ReasoningOpenTag = "<think>",
                ReasoningClosingTag = "</think>"
            },
            new ProviderModel
            {
                ProviderName = "Ollama",
                Name = "bge-m3",
                DisplayName = "bge-m3",
                SupportedTagIds = new List<Guid>
                {
                    DefaultTags.AiGeneration.Embedding.Id
                },
                SupportedTagNames = new List<string>
                {
                    DefaultTags.AiGeneration.Embedding.DisplayName
                },
                ApiKey = null,
                ApiEndpoint = "embed"
            }
        }
    };
    public static readonly Provider OpenRouter = new Provider
    {
        Name = "OpenRouter",
        DisplayName = "OpenRouter",
        Description = "Router for multi-model LLMs",
        ImageUrl = "\r\n<svg\r\n  width=\"512\"\r\n  height=\"512\"\r\n  viewBox=\"0 0 512 512\"\r\n  xmlns=\"http://www.w3.org/2000/svg\"\r\n  fill=\"currentColor\"\r\n  stroke=\"currentColor\"\r\n>\r\n  <g clip-path=\"url(#clip0_205_3)\">\r\n    <path\r\n      d=\"M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945\"\r\n      stroke-width=\"90\"\r\n    />\r\n    <path d=\"M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z\" />\r\n    <path\r\n      d=\"M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377\"\r\n      stroke-width=\"90\"\r\n    />\r\n    <path d=\"M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z\" />\r\n  </g>\r\n</svg>\r\n",
        SupportedTagIds = new List<Guid>
        {
            DefaultTags.AiGeneration.Text.Id
        },
        SupportedTagNames = new List<string>
        {
            DefaultTags.AiGeneration.Text.DisplayName
        },
        ApiBaseUrl = "https://openrouter.ai/api/v1/",
        ApiKey = "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",
        Enabled = true,
        Models = new List<ProviderModel>
        {
            new ProviderModel
            {
                ProviderName = "OpenRouter",
                Name = "google/gemma-3-27b-it:free",
                DisplayName = "Google: Gemma 3 27B (free)",
                SupportedTagIds = new List<Guid>
                {
                    DefaultTags.AiGeneration.Text.Id,
                    DefaultTags.AiGeneration.Image.Id
                },
                SupportedTagNames = new List<string>
                {
                    DefaultTags.AiGeneration.Text.DisplayName,
                    DefaultTags.AiGeneration.Image.DisplayName
                },
                ApiKey = "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",
                ApiEndpoint = "chat/completions"
            }
        }
    };
    public static readonly Provider[] All = new[]
    {
        Ollama,
        OpenRouter
    };
}