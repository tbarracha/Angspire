using Authentication.Domain.AuthUserIdentities;
using Authentication.Domain.Services;
using SpireCore.API.Operations.Attributes;
using System.Security.Claims;

namespace Authentication.Operations;

[OperationAuthorize]
public class GetCurrentUserOperation : AuthOperation<ClaimsPrincipal, AuthUserIdentity?>
{
    public GetCurrentUserOperation(AuthenticationService authenticationService) : base(authenticationService)
    {
    }

    protected override async Task<AuthUserIdentity?> HandleAsync(ClaimsPrincipal request)
    {
        return await _authenticationService.GetCurrentUserAsync(request);
    }
}