using Genspire.Application.Modules.Authentication.Domain.Services;
using SpireCore.API.Operations.Attributes;

namespace Genspire.Application.Modules.Authentication.Operations;
public class LogoutRequestDto
{
    public string RefreshToken { get; set; } = default!;
}

public class EmptyResponseDto
{
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