namespace SpireCore.Commands;

/// <summary>
/// CommandNode represents a node in the command tree, either a command
/// (with an ICommand) or a grouping/category node (with sub-nodes).
/// It handles lookup for both direct names and aliases.
/// </summary>
public class CommandNode
{
    public string Name { get; }
    public string Description { get; }
    public ICommand Command { get; }
    public int Index { get; set; }

    private static int _globalIndex = 0;

    private readonly Dictionary<string, CommandNode> _subNodes = new();
    private readonly Dictionary<string, CommandNode> _aliases = new();

    /// <summary>
    /// Root node constructor.
    /// </summary>
    public CommandNode() : this("", "Root command node") { }

    /// <summary>
    /// Constructor for leaf command nodes.
    /// </summary>
    public CommandNode(ICommand command)
    {
        Name = command.Name;
        Description = command.Description;
        Command = command;
        Index = _globalIndex++;
    }

    /// <summary>
    /// Constructor for groups/category nodes.
    /// </summary>
    public CommandNode(string name, string description = "")
    {
        Name = name;
        Description = description;
        Index = _globalIndex++;
    }

    /// <summary>
    /// Registers a subnode and its aliases.
    /// </summary>
    public void AddSubNode(CommandNode node)
    {
        _subNodes[node.Name] = node;

        // Register aliases if this is a leaf node with a command
        if (node.Command != null)
        {
            foreach (var alias in node.Command.Aliases)
            {
                if (!_aliases.ContainsKey(alias))
                    _aliases[alias] = node;
            }
        }
    }

    /// <summary>
    /// Looks up a subnode by name or alias.
    /// </summary>
    // In CommandNode
    public bool TryGetSubNode(string name, out CommandNode node)
    {
        // Case-insensitive match for subcommand names and aliases
        node = SubNodes
            .FirstOrDefault(n =>
                n.Name.Equals(name, StringComparison.OrdinalIgnoreCase) ||
                n.Command?.Aliases?.Any(a => a.Equals(name, StringComparison.OrdinalIgnoreCase)) == true);

        return node != null;
    }

    /// <summary>
    /// Enumerates direct child nodes.
    /// </summary>
    public IEnumerable<CommandNode> SubNodes => _subNodes.Values;
}

