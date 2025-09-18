namespace SpireCore.Commands;

/// <summary>
/// The CommandManager is responsible for orchestrating CLI execution.
/// It parses arguments, resolves and dispatches commands, handles
/// help and interactive modes, and prints command listings.
/// </summary>
public class CommandManager
{
    // CLI metadata fields (name, version, description)
    private readonly string _cliName;
    private readonly string _cliCall;
    private readonly string _version;
    private readonly string _description;
    private readonly CommandNode _root; // The root of the command tree

    public CommandNode Root => _root;

    /// <summary>
    /// Constructs a CommandManager for the specified command tree and metadata.
    /// </summary>
    public CommandManager(
        CommandNode root,
        string cliName = "SpireCLI",
        string version = "v0.1.0",
        string description = "A project scaffolder for .NET + Angular")
    {
        _root = root;
        _cliName = cliName;
        _version = version;
        _description = description;

        _cliCall = cliName
               .Replace("cli", "", StringComparison.OrdinalIgnoreCase)
               .Trim()
               .ToLowerInvariant();
    }

    /// <summary>
    /// Main entrypoint. Parses args and runs appropriate mode (help, interactive, command).
    /// </summary>
    public CommandResult Run(string[] args)
    {
        Console.WriteLine("\n");

        // Show help if no arguments are given.
        if (args.Length == 0)
        {
            PrintWelcome(true);
            PrintAvailableCommands(_root, true);
            return CommandResult.Success();
        }

        // Launch interactive mode if requested
        if (args.Contains("--interactive"))
            return RunInteractive();

        // Otherwise, run one-shot mode
        return RunOneShot(args);
    }

    /// <summary>
    /// Runs a command immediately and returns its CommandResult.
    /// </summary>
    public CommandResult RunOneShot(string[] args)
    {
        var context = new CommandContext(args, this, _root);
        var result = RunCommand(context);
        Console.WriteLine("\n");

        // Print any message (success or error)
        if (!string.IsNullOrWhiteSpace(result.Message))
        {
            if (result.ExitCode == 0)
                Console.WriteLine(result.Message);
            else
                Console.Error.WriteLine(result.Message);
        }

        return result;
    }

    /// <summary>
    /// Runs the CLI in interactive mode (REPL).
    /// </summary>
    public CommandResult RunInteractive()
    {
        PrintWelcome(true);
        PrintAvailableCommands(_root, true);

        while (true)
        {
            Console.Write("\n> ");
            var input = Console.ReadLine();
            if (string.IsNullOrWhiteSpace(input))
                continue;

            if (input.Equals("exit", StringComparison.OrdinalIgnoreCase))
                break;

            var args = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (args.Contains("--help") || args.Contains("-h"))
            {
                HandleHelp();
                continue;
            }

            var context = new CommandContext(args, this, _root, isInteractive: true);
            var result = RunCommand(context);

            // Print any message (success or error)
            if (!string.IsNullOrWhiteSpace(result.Message))
            {
                if (result.ExitCode == 0)
                    Console.WriteLine(result.Message);
                else
                    Console.Error.WriteLine(result.Message);
            }

            Console.WriteLine("\n");
        }

        return CommandResult.Success();
    }

    /// <summary>
    /// Handles showing the available commands (used for help).
    /// </summary>
    private CommandResult HandleHelp()
    {
        PrintAvailableCommands(_root);
        return CommandResult.Success();
    }

    /// <summary>
    /// Resolves and executes the requested command, handling errors and unknowns.
    /// </summary>
    private CommandResult RunCommand(CommandContext context)
    {
        var node = _root;
        var remaining = context.Args.ToList();

        string invokedCommandName = null;
        // Find the deepest matching command node and invoked command name
        while (remaining.Any())
        {
            var next = remaining[0];
            if (!node.TryGetSubNode(next, out var child))
                break;

            node = child;
            invokedCommandName = next; // This is the command/alias used
            remaining.RemoveAt(0);
        }

        if (node.Command is null)
        {
            var identifier = string.IsNullOrWhiteSpace(node.Name)
                ? node.Description
                : node.Name;

            var msg = $"[ERROR] Unknown command or missing action under '{identifier}'.";
            Console.Error.WriteLine(msg);
            Console.WriteLine();
            PrintAvailableCommands(_root);
            return CommandResult.Error(msg);
        }

        // Pass the invoked command name and stripped args to the context
        var commandContext = new CommandContext(
            remaining.ToArray(),
            this,
            _root,
            invokedCommandName ?? node.Name, // use node.Name as fallback
            context.IsInteractive);

        try
        {
            var result = node.Command.Execute(commandContext);
            return result ?? CommandResult.Success();
        }
        catch (Exception ex)
        {
            return CommandResult.Error("An error occurred while executing the command: " + ex.Message, exitCode: 1);
        }
    }

    /// <summary>
    /// Pretty prints the list of available commands, including aliases, with aligned descriptions.
    /// </summary>
    // ---------------------------------------------------------------------
    // Pretty prints the list of available commands
    // ---------------------------------------------------------------------
    public void PrintAvailableCommands(CommandNode root, bool newLineAtEnd = false)
    {
        // Header
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"\n{_cliName} {_version}");
        Console.ResetColor();

        // Collect commands (unchanged)
        var commands = new List<(string Indent, string GroupKey, string Prefix, string Name, string Description, IEnumerable<string> Aliases)>();
        CollectCommands(root, "", isRootLevel: true, groupKey: "", output: commands);

        // Alignment width (unchanged)
        int maxCommandLength = commands
    .Select(c =>
    {
        var fullName = c.Name;
        if (c.Aliases.Any())
            fullName += $" ({string.Join(", ", c.Aliases)})";

        string prefixSegment = string.IsNullOrWhiteSpace(c.Prefix) ? "" : c.Prefix + " ";
        return ("  " +                 // indent
                _cliCall + " " +
                prefixSegment +
                fullName).Length;
    })
    .DefaultIfEmpty(0)
    .Max();

        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("Available commands:\n");
        Console.ResetColor();

        string lastGroup = null;

        foreach (var cmd in commands)
        {
            // Group headers
            if (cmd.GroupKey != lastGroup)
            {
                if (lastGroup != null) Console.WriteLine();
                if (!string.IsNullOrWhiteSpace(cmd.GroupKey))
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine($"  {cmd.GroupKey} commands:");
                    Console.ResetColor();
                }
                lastGroup = cmd.GroupKey;
            }

            string indent = "  ";                 // every command starts with 2 spaces
            Console.Write(indent);

            // ALWAYS print CLI name first
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Write(_cliCall + " ");

            // Print prefix if any (e.g. ai, builder)
            if (!string.IsNullOrWhiteSpace(cmd.Prefix))
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.Write(cmd.Prefix + " ");
            }

            // Command name
            Console.ForegroundColor = ConsoleColor.White;
            Console.Write($"{cmd.Name}");

            // Align description
            string printed = indent +
                     _cliCall + " " +
                     (string.IsNullOrWhiteSpace(cmd.Prefix) ? "" : cmd.Prefix + " ") +
                     cmd.Name;

            Console.Write(new string(' ', maxCommandLength - printed.Length));

            Console.ForegroundColor = ConsoleColor.Gray;
            Console.WriteLine($" : {cmd.Description}");

            // Aliases block (unchanged)
            if (cmd.Aliases.Any())
            {
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.WriteLine($"{indent}  or: {string.Join(", ", cmd.Aliases)}");
            }

            Console.ResetColor();
        }

        if (newLineAtEnd) Console.WriteLine();
    }

    /// <summary>
    /// Recursively collects all commands from the tree for pretty-printing.
    /// </summary>
    private void CollectCommands(
        CommandNode node,
        string prefix,
        bool isRootLevel,
        string groupKey,
        List<(string Indent, string GroupKey, string Prefix, string Name, string Description, IEnumerable<string> Aliases)> output)
    {
        string indent = isRootLevel ? "  " : "    ";

        if (node.Command is not null)
        {
            string effectiveGroupKey = string.IsNullOrWhiteSpace(groupKey) ? "" : groupKey;
            output.Add((indent, effectiveGroupKey, prefix, node.Name, node.Description, node.Command.Aliases));
        }

        if (node.SubNodes.Any())
        {
            string newGroupKey = string.IsNullOrWhiteSpace(prefix) ? node.Name : $"{prefix} {node.Name}";
            foreach (var child in node.SubNodes.OrderBy(n => n.Index))
            {
                string newPrefix = string.IsNullOrWhiteSpace(prefix) ? node.Name : $"{prefix} {node.Name}";
                CollectCommands(child, newPrefix, isRootLevel: false, groupKey: newGroupKey, output);
            }
        }
    }

    /// <summary>
    /// Prints a stylized CLI banner (welcome message).
    /// </summary>
    public void PrintWelcome(bool newLineAtEnd = false)
    {
        var border = new string('-', 50);

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine($"+{border}+");

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"¦{_cliName.PadLeft((_cliName.Length + 50) / 2).PadRight(50)}¦");

        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"¦{$"Version {_version}".PadLeft(32).PadRight(50)}¦");

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine($"¦{" ".PadRight(50)}¦");

        if (!string.IsNullOrWhiteSpace(_description))
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"¦{_description.PadLeft((_description.Length + 50) / 2).PadRight(50)}¦");
        }

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine($"+{border}+");

        Console.ResetColor();

        if (newLineAtEnd)
            Console.WriteLine();
    }
}

