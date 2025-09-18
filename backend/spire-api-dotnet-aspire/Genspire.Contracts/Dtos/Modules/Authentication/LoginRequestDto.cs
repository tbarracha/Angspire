namespace Genspire.Contracts.Dtos.Modules.Authentication;

public class LoginRequestDto
{
    public string Identifier { get; set; } = default!; // Email or Username
    public string Password { get; set; } = default!;
}

