namespace AngspireDotNetAPI.ApiService.Core.Authentication.ViewModels
{
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;

        public bool Result { get; set; }

        public string Message { get; set; } = string.Empty;
    }
}
