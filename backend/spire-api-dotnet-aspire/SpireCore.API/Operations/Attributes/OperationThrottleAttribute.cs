// File: SpireCore.API.Operations/Attributes/OperationThrottleAttribute.cs
namespace SpireCore.API.Operations.Attributes;

/// <summary>
/// Attach to an operation to select a named rate-limit policy
/// (configured in AddOperations()).
/// If omitted, "ops-default" is applied.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false, AllowMultiple = false)]
public sealed class OperationThrottleAttribute : Attribute
{
    public string PolicyName { get; }
    public OperationThrottleAttribute(string policyName) => PolicyName = policyName;
}
