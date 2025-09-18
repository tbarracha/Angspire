
namespace SpireCore.API.Operations;

public interface IUserScopedRequest
{
    string? UserId { get; set; }
}

public interface IUserScopedRequest<T>
{
    T? UserId { get; set; }
}