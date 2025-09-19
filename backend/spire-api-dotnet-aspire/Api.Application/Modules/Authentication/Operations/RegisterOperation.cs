using Genspire.Application.Modules.Authentication.Domain.Services;
using Genspire.Contracts.Dtos.Modules.Authentication;
using SpireCore.API.Operations.Attributes;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Genspire.Application.Modules.Authentication.Operations;
/* ----------------------------  REQUEST DTOs  ---------------------------- */
/// <summary>Payload for registering a *human* user.</summary>
public sealed class RegisterUserRequestDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = default!;

    [Required, MinLength(6)]
    public string Password { get; set; } = default!;

    [Required]
    public string FirstName { get; set; } = default!;

    [Required]
    public string LastName { get; set; } = default!;
    public string? UserName { get; set; } // optional explicit handle
}

/// <summary>Payload for registering a *service / machine* principal.</summary>
public sealed class RegisterServiceRequestDto
{
    [Required, MinLength(3)]
    [Description("Logical service identifier; becomes the JWT client_id / sub.")]
    public string ServiceName { get; set; } = default!;

    [Required, MinLength(12)]
    [Description("Initial client secret (will be hashed like a user password).")]
    public string ClientSecret { get; set; } = default!;

    [Description("Optional OAuth scopes/roles granted to the service.")]
    public string[]? Scopes { get; set; }
}

/* ----------------------------  OPERATIONS  ---------------------------- */
/// <summary>Registers a *human* user and returns JWT + refresh tokens.</summary>
[OperationGroup("Auth Public")]
[OperationRoute("/auth/register/user")]
public sealed class RegisterUserOperation : AuthOperation<RegisterUserRequestDto, AuthResponseDto>
{
    public RegisterUserOperation(AuthenticationService authService) : base(authService)
    {
    }

    protected override async Task<AuthResponseDto> HandleAsync(RegisterUserRequestDto req)
    {
        var (access, refresh) = await _authenticationService.RegisterUserAsync(req.Email, req.Password, req.FirstName, req.LastName, req.UserName);
        return new AuthResponseDto
        {
            AccessToken = access,
            RefreshToken = refresh
        };
    }
}

/// <summary>Registers a *service / machine* principal and returns JWT + refresh tokens.</summary>
[OperationGroup("Auth Public")]
[OperationRoute("/auth/register/service")]
public sealed class RegisterServiceOperation : AuthOperation<RegisterServiceRequestDto, AuthResponseDto>
{
    public RegisterServiceOperation(AuthenticationService authService) : base(authService)
    {
    }

    protected override async Task<AuthResponseDto> HandleAsync(RegisterServiceRequestDto req)
    {
        var (access, refresh) = await _authenticationService.RegisterServiceAsync(req.ServiceName, req.ClientSecret, req.Scopes);
        return new AuthResponseDto
        {
            AccessToken = access,
            RefreshToken = refresh
        };
    }
}