using Microsoft.AspNetCore.Identity;

namespace AngspireDotNetAPI.ApiService.Core.Authentication.Models
{
    public class User : IdentityUser
    {
        public string Name { get; set; } = String.Empty;

        public string LastName { get; set; } = String.Empty;
    }
}
