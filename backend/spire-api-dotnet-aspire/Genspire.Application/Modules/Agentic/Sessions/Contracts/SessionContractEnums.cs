// SessionContractEnums.cs
namespace Genspire.Application.Modules.Agentic.Sessions.Contracts;

/// <summary>How a request intends to use or create a timeline.</summary>
public enum TimelineAction
{
    /// <summary>Use existing TimelineId (default).</summary>
    Use,

    /// <summary>Fork from TargetTurnIndex (or TargetTurnId) in base TimelineId (copy-on-write).</summary>
    ForkFromTurn,

    /// <summary>Fork from the current head of base TimelineId.</summary>
    ForkFromHead
}

/// <summary>Chat operation semantics (relative to a SessionTurn).</summary>
public enum ChatOperationKind
{
    /// <summary>
    /// Add a new turn at the end:
    /// - Create a new user message (from NewUserContent).
    /// - Generate a new assistant message in the same turn.
    /// </summary>
    Append,

    /// <summary>
    /// Edit the user message of an existing turn (TargetTurnIndex/TargetTurnId):
    /// - Append a new user message version (from NewUserContent).
    /// - Generate a new assistant message in the same turn.
    /// - Timeline may fork per TimelineAction.
    /// </summary>
    EditInputMessage,

    /// <summary>
    /// Regenerate only the assistant message for an existing turn (TargetTurnIndex/TargetTurnId):
    /// - Append a new assistant message variant in the same turn.
    /// - Timeline may fork per TimelineAction.
    /// </summary>
    RegenerateOutputMessage
}

/// <summary>Turn step kind (string-backed in persistence if needed).</summary>
public enum TurnStepKind
{
    AssistantToolCall,
    ToolResult,
    AssistantPartial
}
