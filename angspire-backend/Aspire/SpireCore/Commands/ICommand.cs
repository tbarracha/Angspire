namespace SpireCore.Commands;

/// <summary>
/// Represents a single executable command in the CLI.
/// All commands should implement this interface.
/// </summary>
public interface ICommand
{
    /// <summary>
    /// The main command name, e.g., "help", "version".
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Human-readable description for help output.
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Alternate names/flags (aliases) that also invoke this command.
    /// </summary>
    IEnumerable<string> Aliases { get; }

    /// <summary>
    /// Executes the command with the given context.
    /// Returns an exit code (0 = success).
    /// </summary>
    CommandResult Execute(CommandContext context);
}

