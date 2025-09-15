using Genspire.Application.Modules.GenAI.Common.Interfaces;
using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Values;
public record InteractionMessage : ChatMessage, IInteractionMessage
{
    [DefaultValue("[]")]
    public List<EncodedFile> Attachments { get; set; } = new List<EncodedFile>();
}