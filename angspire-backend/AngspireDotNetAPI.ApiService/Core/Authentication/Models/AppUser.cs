using Microsoft.AspNetCore.Identity;

namespace AngspireDotNetAPI.ApiService.Core.Authentication.Models
{
    public class AppUser : IdentityUser
    {
        public string Name { get; set; } = String.Empty;

        public string LastName { get; set; } = String.Empty;

        public int SubscriptionType { get; set; }
    }
}
