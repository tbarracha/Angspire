using SpireCore.Commands;

namespace Genspire.CLI.CommandManagers;

public class GenspireCommandManager : CommandManager
{
    public GenspireCommandManager(CommandNode root, string cliName = "GenspireCLI", string version = "v0.1.0", string description = "Genspire CLI") : base(root, cliName, version, description)
    {
    }
}
