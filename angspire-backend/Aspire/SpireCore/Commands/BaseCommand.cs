namespace SpireCore.Commands;

/// <summary>
/// BaseCommand is a convenience abstract base for all commands,
/// providing default implementations for Name, Description, and Aliases.
/// </summary>
public abstract class BaseCommand : ICommand
{
    /// <summary>
    /// Command name defaults to the class name minus "Command", lowercased.
    /// </summary>
    public virtual string Name => GetType().Name.Replace("Command", "").ToLowerInvariant();

    /// <summary>
    /// Default description (override in derived).
    /// </summary>
    public virtual string Description => "No description provided.";

    /// <summary>
    /// Default: no aliases (override in derived).
    /// </summary>
    public virtual IEnumerable<string> Aliases => Enumerable.Empty<string>();

    /// <summary>
    /// Command logic (must be implemented in derived).
    /// </summary>
    public abstract CommandResult Execute(CommandContext context);

    /// <summary>
    /// Lets a command run asynchronous code while still satisfying the
    /// synchronous <see cref="ICommand.Execute"/> signature.
    /// Usage: <c>return RunAsync(() => DoWorkAsync(context));</c>
    /// </summary>
    protected CommandResult RunAsync(
        Func<Task<CommandResult>> asyncFunc)
    {
        // .GetAwaiter().GetResult() avoids AggregateException wrapping
        return asyncFunc().GetAwaiter().GetResult();
    }

    /// <summary>
    /// Optional utility for printing commands for internal custom commands.
    /// </summary>
    protected void PrintAvailableCommands(CommandNode node, string prefix = "")
    {
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("Available commands:\n");

        foreach (var child in node.SubNodes.OrderBy(n => n.Name))
        {
            if (child.Command is not null)
            {
                var fullCommand = $"{prefix}{child.Name}";
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write(fullCommand.PadRight(15));

                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.WriteLine($": {child.Description}");
            }

            if (child.SubNodes.Any())
                PrintAvailableCommands(child, prefix + child.Name + " ");
        }

        Console.ResetColor();
    }
}

