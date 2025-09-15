using Genspire.Application.Modules.GenAI.Common.Values;
using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Interfaces;
public interface IInteractionMessage : IChatMessage
{
    [DefaultValue("[]")]
    public List<EncodedFile> Attachments { get; set; } // Optional, for file attachments
}