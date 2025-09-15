using SpireCore.Abstractions.Interfaces;
using SpireCore.API.DbProviders.Mongo.Entities;
using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Generation.Settings.Models;
public class GenerationSettings : MongoAuditableEntity, IIsDefault
{
    public TextGenerationSettings Text { get; set; } = new();
    public ReasoningSettings Reasoning { get; set; } = new();
    public AudioGenerationSettings Audio { get; set; } = new();
    public ImageGenerationSettings Image { get; set; } = new();
    public VideoGenerationSettings Video { get; set; } = new();
    public EmbeddingSettings Embeddings { get; set; } = new();
    public ToolSettings Tools { get; set; } = new();
    public string? AgentId { get; set; } = "default-agent";
    public string? Language { get; set; } = "en";

    [DefaultValue(false)]
    public bool IsDefault { get; set; } = false;
}

public abstract class BaseGenerationSettings : MongoAuditableEntity, IIsDefault
{
    [DefaultValue(false)]
    public virtual bool Enabled { get; set; } = false;

    [DefaultValue("OpenRouter")]
    public virtual string Provider { get; set; } = "OpenRouter";

    [DefaultValue("")]
    public string ApiKey { get; set; } = string.Empty;
    public abstract string Model { get; set; }

    [DefaultValue(false)]
    public bool IsDefault { get; set; } = false;
}

// TEXT
public class TextGenerationSettings : BaseGenerationSettings
{
    [DefaultValue("OpenRouter")]
    public override string Provider { get; set; } = "OpenRouter";

    [DefaultValue("moonshotai/kimi-k2:free")]
    public override string Model { get; set; } = "moonshotai/kimi-k2:free";

    [DefaultValue(0.7)]
    public double? Temperature { get; set; } = 0.7;

    [DefaultValue(0)]
    public int? MaxTokens { get; set; }

    [DefaultValue(true)]
    public bool Streaming { get; set; } = true;

    [DefaultValue(false)]
    public bool Thinking { get; set; } = false;
}

// REASONING
public class ReasoningSettings : BaseGenerationSettings
{
    [DefaultValue("OpenRouter")]
    public override string Provider { get; set; } = "OpenRouter";

    [DefaultValue("openrouter/cypher-alpha:free")]
    public override string Model { get; set; } = "openrouter/cypher-alpha:free";
}

// AUDIO
public class AudioGenerationSettings : BaseGenerationSettings
{
    [DefaultValue("AzureTTS")]
    public override string Provider { get; set; } = "AzureTTS";

    [DefaultValue("en-US-AriaNeural")]
    public override string Model { get; set; } = "en-US-AriaNeural";

    [DefaultValue("wav")]
    public string? InputFormat { get; set; } = "wav";

    [DefaultValue("mp3")]
    public string? OutputFormat { get; set; } = "mp3";

    [DefaultValue(44100.0)]
    public double SamplingRate { get; set; } = 44100.0;
}

// IMAGE
public class ImageGenerationSettings : BaseGenerationSettings
{
    [DefaultValue("StableDiffusion")]
    public override string Provider { get; set; } = "StableDiffusion";

    [DefaultValue("sd-xl")]
    public override string Model { get; set; } = "sd-xl";

    [DefaultValue("png")]
    public string? InputFormat { get; set; } = "png";

    [DefaultValue("png")]
    public string? OutputFormat { get; set; } = "png";

    [DefaultValue(1024)]
    public int? MaxWidth { get; set; } = 1024;

    [DefaultValue(1024)]
    public int? MaxHeight { get; set; } = 1024;
}

// VIDEO
public class VideoGenerationSettings : BaseGenerationSettings
{
    [DefaultValue("Pika")]
    public override string Provider { get; set; } = "Pika";

    [DefaultValue("pika-v1")]
    public override string Model { get; set; } = "pika-v1";

    [DefaultValue("mp4")]
    public string? InputFormat { get; set; } = "mp4";

    [DefaultValue("mp4")]
    public string? OutputFormat { get; set; } = "mp4";

    [DefaultValue(1280)]
    public int? MaxWidth { get; set; } = 1280;

    [DefaultValue(720)]
    public int? MaxHeight { get; set; } = 720;
}

// EMBEDDINGS
public class EmbeddingSettings : BaseGenerationSettings
{
    [DefaultValue("OpenAI")]
    public override string Provider { get; set; } = "OpenAI";

    [DefaultValue("text-embedding-ada-002")]
    public override string Model { get; set; } = "text-embedding-ada-002";

    [DefaultValue(1536)]
    public int Dimensions { get; set; } = 1536;
}

// TOOLS
public class ToolSettings : MongoAuditableEntity, IIsDefault
{
    [DefaultValue(false)]
    public bool Enabled { get; set; } = false;

    [DefaultValue("[]")]
    public List<string>? AllowedTools { get; set; }

    [DefaultValue(false)]
    public bool IsDefault { get; set; } = false;
}