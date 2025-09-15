
namespace SpireCore.API.Operations.Attributes;

/// <summary>Choose streaming wire format for this operation. Defaults to NDJSON.</summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false, AllowMultiple = false)]
public sealed class OperationStreamAttribute : Attribute
{
    public OperationStreamAttribute(string? format = null) => Format = format;
    /// "ndjson" (default) or "sse"
    public string? Format { get; }
}