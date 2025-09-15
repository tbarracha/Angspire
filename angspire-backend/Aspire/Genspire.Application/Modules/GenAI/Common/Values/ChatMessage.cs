using Genspire.Application.Modules.GenAI.Common.Interfaces;
using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Values;
public record ChatMessage : IChatMessage
{
    [DefaultValue(ChatRoles.USER)]
    public string Role { get; set; } = string.Empty; // system | user | assistant | tool

    [DefaultValue("Hello! How are you?")]
    public string Content { get; set; } = string.Empty;
}