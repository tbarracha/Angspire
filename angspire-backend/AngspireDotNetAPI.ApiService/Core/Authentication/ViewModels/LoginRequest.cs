﻿using System.ComponentModel.DataAnnotations;

namespace AngspireDotNetAPI.ApiService.Core.Authentication.ViewModels
{
    public class LoginRequest
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
