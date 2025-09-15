using Genspire.Application.Modules.GenAI.Common.Values;
using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Interfaces;
public interface IChatMessage
{
    [DefaultValue(ChatRoles.USER)]
    public string Role { get; set; } // system | user | assistant | tool

    [DefaultValue("Hello! How are you?")]
    public string Content { get; set; }
}