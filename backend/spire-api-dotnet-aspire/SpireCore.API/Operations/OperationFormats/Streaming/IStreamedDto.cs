// File: SpireCore/API/Operations/IStreamedDto.cs
namespace SpireCore.API.Operations.Streaming;

/// <summary>
/// Contract for any DTO that is sent as part of a streamed operation.
/// Enforces correlation and terminal signaling.
/// </summary>
public interface IStreamedDto
{
    /// <summary>Correlation id for this stream request.</summary>
    string? RequestId { get; set; }

    /// <summary>Monotonic frame sequence (0..N). Null if not applicable.</summary>
    int? Index { get; set; }

    /// <summary>True only on the terminal frame of the stream.</summary>
    bool IsFinished { get; set; }

    /// <summary>Reason for finishing: "completed" | "cancelled" | "faulted" | provider-specific.</summary>
    string? FinishReason { get; set; }
}
