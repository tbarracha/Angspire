using Genspire.Application.Modules.Authentication.Domain.AuthUserIdentities;
using Genspire.Application.Modules.Authentication.Domain.Services;
using SpireCore.API.Operations.Attributes;

namespace Genspire.Application.Modules.Authentication.Operations;
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