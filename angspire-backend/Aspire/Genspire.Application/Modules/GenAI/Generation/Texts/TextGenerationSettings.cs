using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Generation.Texts;
public class TextGenerationSettings
{
    [DefaultValue(0.6)]
    public double Temperature { get; init; } = 0.6;

    [DefaultValue(20)]
    public int TopK { get; init; } = 20;

    [DefaultValue(0.9)]
    public double TopP { get; init; } = 0.9;

    [DefaultValue(4096)]
    public int MaxTokens { get; init; } = 4096;

    [DefaultValue(100)]
    public int NumPredict { get; init; } = 100;

    [DefaultValue(1.2)]
    public double RepeatPenalty { get; init; } = 1.2;

    [DefaultValue(1.5)]
    public double PresencePenalty { get; init; } = 1.5;

    [DefaultValue(1.0)]
    public double FrequencyPenalty { get; init; } = 1.0;

    [DefaultValue(-1)]
    public int Seed { get; init; } = -1;

    [DefaultValue("[]")]
    public List<string>? Stop { get; init; } = new();
}