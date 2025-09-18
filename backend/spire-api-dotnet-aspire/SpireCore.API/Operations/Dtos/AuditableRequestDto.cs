namespace SpireCore.API.Operations.Dtos;

public abstract class OperationRequest : IUserScopedRequest
{
    public string? UserId { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

public class OperationRequest<T> : OperationRequest
{
    public T Data { get; set; } = default!;
}
