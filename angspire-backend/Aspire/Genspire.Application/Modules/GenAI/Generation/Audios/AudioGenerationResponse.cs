namespace Genspire.Application.Modules.GenAI.Generation.Audios;
public class AudioGenerationResponse
{
    public byte[] AudioData { get; set; } = null!;
    public string? AudioUrl { get; set; }
}