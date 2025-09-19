namespace Genspire.Application.Modules.GenAI.Tokenization.Models;
public class AITokenizerConfig
{
    public string Name { get; }
    public string Extension { get; }
    public string Url { get; }

    public AITokenizerConfig(string name, string extension, string url)
    {
        Name = name;
        Extension = extension;
        Url = url;
    }
}