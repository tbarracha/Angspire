namespace Genspire.Application.Modules.GenAI.Generation.Videos;
public class VideoGenerationResponse
{
    public byte[] VideoData { get; set; } = null!;
    public string? VideoUrl { get; set; }
}