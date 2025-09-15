using Genspire.CLI.Commands.AI;
using Genspire.CLI.Commands.Builder.Api;
using Genspire.CLI.Commands.Genspire;
using Microsoft.Extensions.Configuration;
using SpireCore.Commands;

namespace Genspire.CLI.CommandManagers;

public static class GenspireCommandManagerBuilder
{
    public static GenspireCommandManager BuildCommandManager(
        IConfiguration configuration,
        IServiceProvider provider,
        string cliName = "GenspireCLI",
        string version = "v0.0.1",
        string description = "Genspire Command Line Interface")
    {
        var root = new CommandNode();

        var aiNode = new CommandNode("ai", "AI-related commands");
        aiNode.AddSubNode(new CommandNode(new ChatbotCommand(provider)));
        root.AddSubNode(aiNode);

        // Genspire section
        var genspireNode = new CommandNode("gen", "Genspire related commands");
        genspireNode.AddSubNode(new CommandNode(new ExportGenspireOperationContractsCommand()));
        genspireNode.AddSubNode(new CommandNode(new RefactorOperationsToBaseCommand()));
        root.AddSubNode(genspireNode);

        // Builder section
        var builderNode = new CommandNode("builder", "Project scaffolding and builder commands");
        builderNode.AddSubNode(new CommandNode(new ExportTypeScriptDtosCommand()));
        root.AddSubNode(builderNode);

        return new GenspireCommandManager(root, cliName, version, description);
    }
}
