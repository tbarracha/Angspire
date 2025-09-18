using Authentication.Domain.AuthUserIdentities;
using Authentication.Domain.Services;
using SpireCore.API.Operations.Attributes;

namespace Authentication.Operations;

[OperationAuthorize]
[OperationRoute("/auth/get/jwtuser/id")]
public class GetUserByIdOperation : AuthOperation<Guid, AuthUserIdentity?>
{
    public GetUserByIdOperation(AuthenticationService authenticationService) : base(authenticationService)
    {
    }

    protected override async Task<AuthUserIdentity?> HandleAsync(Guid request)
    {
        return await _authenticationService.GetAuthIdentityByIdAsync(request);
    }
}