namespace SpireCore.Commands;

/// <summary>
/// The result of executing a CLI command.
/// </summary>
public class CommandResult
{
    /// <summary>
    /// The exit code (0 = success, nonzero = error).
    /// </summary>
    public int ExitCode { get; }

    /// <summary>
    /// An optional message to display to the user (error, info, etc.).
    /// </summary>
    public string? Message { get; }

    /// <summary>
    /// Optional: Any additional data to pass along.
    /// </summary>
    public object? Data { get; }

    public CommandResult(int exitCode = 0, string? message = null, object? data = null)
    {
        ExitCode = exitCode;
        Message = message;
        Data = data;
    }

    public static CommandResult Success(string? message = null) => new(0, message);
    public static CommandResult Error(string? message = null, int exitCode = 1) => new(exitCode, message);
    public static CommandResult FromExitCode(int code, string? message = null) => new(code, message);

    public override string ToString()
        => $"{(ExitCode == 0 ? "Success" : "Error")} ({ExitCode}){(Message is not null ? $": {Message}" : "")}";
}

