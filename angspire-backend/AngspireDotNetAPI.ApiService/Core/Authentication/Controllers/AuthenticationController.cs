using AngspireDotNetAPI.ApiService.Core.Authentication.Models;
using AngspireDotNetAPI.ApiService.Core.Authentication.ViewModels;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AngspireDotNetAPI.ApiService.Core.Authentication.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthenticationController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;

        public AuthenticationController(UserManager<User> userManager, IConfiguration configuration)
        {
            _userManager = userManager;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<ActionResult<string>> Register([FromBody] RegisterRequest model)
        {
            Console.WriteLine($"Incoming model: {System.Text.Json.JsonSerializer.Serialize(model)}");

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var newUser = new User
            {
                Name = model.Name,
                UserName = model.Email,
                Email = model.Email,
            };

            var result = await _userManager.CreateAsync(newUser, model.Password);

            Console.WriteLine("Register Result:\n", result);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return Ok(new AuthResponse
            {
                Result = true,
                Message = "User registered successfully",
            });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            User? user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                return Unauthorized(new AuthResponse
                {
                    Result = false,
                    Message = "Invalid username and password combination",
                    Token = ""
                });
            }

            bool isPasswordValid = await _userManager.CheckPasswordAsync(user, model.Password);
            if (!isPasswordValid)
            {
                return Unauthorized(new AuthResponse
                {
                    Result = false,
                    Message = "Invalid username and password combination",
                    Token = ""
                });
            }

            string token = CreateToke(user);

            return Ok(new AuthResponse
            {
                Result = true,
                Message = "User logged in successfully",
                Token = token,
            });
        }

        private string CreateToke(User user)
        {
            IConfigurationSection authSettings = _configuration.GetSection("AuthSettings");

            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            byte[] key = Encoding.ASCII.GetBytes(authSettings.GetSection("securityKey").Value!);

            List<Claim> claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Aud, authSettings.GetSection("validAudience").Value!),
                new Claim(JwtRegisteredClaimNames.Iss, authSettings.GetSection("validIssuer").Value!),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, user.Name ?? ""),
                new Claim(JwtRegisteredClaimNames.NameId, user.Id ?? ""),
            };

            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(1),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature
                )
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}
