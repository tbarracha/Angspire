namespace SpireCore.Commands;

/// <summary>
/// CommandContext provides contextual information to commands when executed,
/// including arguments, the command manager, the command tree root,
/// interactivity status, and the current working directory.
/// </summary>
public class CommandContext
{
    public string[] Args { get; }
    public CommandManager CommandManager { get; }
    public CommandNode Root { get; }
    public string InvokedCommandName { get; }
    public bool IsInteractive { get; }
    public string CurrentDirectory { get; }

    public CommandContext(string[] args, CommandManager commandManager, CommandNode root, string invokedCommandName = null, bool isInteractive = false)
    {
        Args = args;
        CommandManager = commandManager;
        Root = root;
        InvokedCommandName = invokedCommandName ?? "";
        IsInteractive = isInteractive;
        CurrentDirectory = Directory.GetCurrentDirectory();
    }

    /// <summary>
    /// Returns the argument at the specified index, or null if out of range.
    /// </summary>
    public string GetArg(int index) => index < Args.Length ? Args[index] : null;
}

