// File: SpireCore/API/Operations/OperationExceptions.cs
namespace SpireCore.API.Operations.Exceptions;

public sealed class OperationForbiddenException : Exception
{
    public OperationForbiddenException(string? message = null)
        : base(message ?? "Forbidden.") { }
}

public sealed class OperationValidationException : Exception
{
    public OperationValidationException(IEnumerable<string> errors)
        : base("Validation failed.") => Errors = errors.ToArray();

    public IReadOnlyList<string> Errors { get; }
}
