using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Interfaces;
public interface IModelProvider
{
    [DefaultValue("ollama")]
    public string Provider { get; set; }

    [DefaultValue("gemma3:12b")]
    public string Model { get; set; }
}