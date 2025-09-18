using SpireCore.API.Operations.Attributes;
using Authentication.Domain.Services;
using Shared.Contracts.Dtos.Authentication;

namespace Authentication.Operations;

[OperationGroup("Auth Public")]
[OperationRoute("/auth/login")]
public class LoginOperation : AuthOperation<LoginRequestDto, AuthResponseDto>
{
    public LoginOperation(AuthenticationService authenticationService) : base(authenticationService)
    {
    }

    protected override async Task<AuthResponseDto> HandleAsync(LoginRequestDto request)
    {
        var (accessToken, refreshToken) = await _authenticationService.LoginAsync(request.Identifier, request.Password);
        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };
    }
}