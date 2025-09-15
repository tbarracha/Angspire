using SpireCore.API.Operations.Attributes;
using Authentication.Domain.Services;
using Shared.Contracts.Dtos.Authentication;

namespace Authentication.Operations;

[OperationAuthorize]
[OperationRoute("/auth/refresh")]
public class RefreshTokenOperation : AuthOperation<RefreshTokenRequestDto, AuthResponseDto>
{
    public RefreshTokenOperation(AuthenticationService authenticationService) : base(authenticationService)
    {
    }

    protected override async Task<AuthResponseDto> HandleAsync(RefreshTokenRequestDto request)
    {
        var accessToken = await _authenticationService.RefreshTokenAsync(request.RefreshToken);
        // If you want to also rotate the refresh token, update this as needed.
        return new AuthResponseDto
        {
            AccessToken = accessToken.AccessToken,
            RefreshToken = accessToken.RefreshToken
        };
    }
}