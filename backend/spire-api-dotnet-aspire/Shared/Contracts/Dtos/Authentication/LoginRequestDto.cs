namespace Shared.Contracts.Dtos.Authentication;

public class LoginRequestDto
{
    public string Identifier { get; set; } = default!; // Email or Username
    public string Password { get; set; } = default!;
}

