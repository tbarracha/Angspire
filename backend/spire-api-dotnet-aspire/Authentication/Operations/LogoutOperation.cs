using Authentication.Domain.Services;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Dtos;

namespace Authentication.Operations;

public class LogoutRequestDto
{
    public string RefreshToken { get; set; } = default!;
}

[OperationAuthorize]
[OperationRoute("/auth/logout")]
public class LogoutOperation : AuthOperation<LogoutRequestDto, EmptyResponseDto>
{
    public LogoutOperation(AuthenticationService authenticationService) : base(authenticationService)
    {
    }

    protected override async Task<EmptyResponseDto> HandleAsync(LogoutRequestDto request)
    {
        await _authenticationService.LogoutAsync(request.RefreshToken);
        return new EmptyResponseDto();
    }
}