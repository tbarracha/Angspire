using Authentication.Domain.Services;
using SpireCore.API.Operations;

namespace Authentication.Operations;

public abstract class AuthOperation<TRequest, TResponse> : OperationBase<TRequest, TResponse>
{
    protected readonly AuthenticationService _authenticationService;
    protected AuthOperation(AuthenticationService authenticationService)
    {
        _authenticationService = authenticationService;
    }

    protected override abstract Task<TResponse> HandleAsync(TRequest request);
}