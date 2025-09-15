namespace Genspire.Application.Modules.GenAI.Generation.Images;
public class ImageGenerationResponse
{
    public byte[] ImageData { get; set; } = null!; // or URL, etc.
    public string? ImageUrl { get; set; }
}