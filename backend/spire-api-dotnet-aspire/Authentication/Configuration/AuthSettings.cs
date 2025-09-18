namespace Authentication.Configuration;
public class AuthenticationOptions
{
    public SuperAdminOptions SuperAdmin { get; set; } = new();
    public List<string> AllowedIps { get; set; } = new();
    public bool CheckAllowedIps { get; set; } = true;
}

public class SuperAdminOptions
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}