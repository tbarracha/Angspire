using AngspireDotNetAPI.ApiService.Core.Authentication.Models;
using AngspireDotNetAPI.ApiService.Core.Authentication.ViewModels;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AngspireDotNetAPI.ApiService.Core.Authentication.Services
{
    public class AuthenticationService
    {
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthenticationService> _logger;

        public AuthenticationService(UserManager<User> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, ILogger<AuthenticationService> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Ensures the existence of an admin user and role.
        /// </summary>
        public async Task EnsureAdminUserAsync()
        {
            var adminEmail = _configuration["AdminSettings:Email"];
            var adminPassword = _configuration["AdminSettings:Password"];
            var adminRole = _configuration["AdminSettings:Role"] ?? "Admin";

            if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword))
            {
                Console.WriteLine("Admin credentials are missing in configuration.");
                return;
            }

            var adminUser = await _userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new User
                {
                    Name = "Admin",
                    UserName = adminEmail,
                    Email = adminEmail
                };

                var result = await _userManager.CreateAsync(adminUser, adminPassword);
                if (!result.Succeeded)
                {
                    Console.WriteLine("Failed to create admin user: " + string.Join(", ", result.Errors.Select(e => e.Description)));
                    return;
                }
            }

            if (!await _roleManager.RoleExistsAsync(adminRole))
            {
                await _roleManager.CreateAsync(new IdentityRole(adminRole));
            }

            if (!await _userManager.IsInRoleAsync(adminUser, adminRole))
            {
                await _userManager.AddToRoleAsync(adminUser, adminRole);
            }

            Console.WriteLine("Admin user ensured.");
        }

        /// <summary>
        /// Registers a new user.
        /// </summary>
        public async Task<AuthResponse> RegisterAsync(RegisterRequest model)
        {
            if (await _userManager.FindByEmailAsync(model.Email) != null)
                return new AuthResponse { Result = false, Message = "Email is already registered." };

            var newUser = new User
            {
                Name = model.Name,
                UserName = model.Email,
                Email = model.Email
            };

            var result = await _userManager.CreateAsync(newUser, model.Password);
            if (!result.Succeeded)
                return new AuthResponse { Result = false, Message = "Registration failed.", Errors = result.Errors.Select(e => e.Description).ToList() };

            return new AuthResponse { Result = true, Message = "User registered successfully" };
        }

        /// <summary>
        /// Authenticates a user and returns a JWT token.
        /// </summary>
        public async Task<AuthResponse> LoginAsync(LoginRequest model)
        {
            _logger.LogInformation("Login request received for Email: {Email}", model.Email);

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                _logger.LogWarning("User not found: {Email}", model.Email);
                return new AuthResponse { Result = false, Message = "Invalid username and password combination" };
            }

            if (!await _userManager.CheckPasswordAsync(user, model.Password))
            {
                _logger.LogWarning("Invalid password attempt for Email: {Email}", model.Email);
                return new AuthResponse { Result = false, Message = "Invalid username and password combination" };
            }

            // Generate the JWT token
            string rawToken = GenerateToken(user);
            _logger.LogInformation("Generated JWT Token for User: {Email}", model.Email);

            return new AuthResponse
            {
                Result = true,
                Message = "User logged in successfully",
                Token = rawToken
            };
        }

        /// <summary>
        /// Retrieves all registered users.
        /// </summary>
        public async Task<List<object>> GetAllUsersAsync()
        {
            return await _userManager.Users
                .Select(user => (object)new { user.Name, user.Email })
                .ToListAsync();
        }

        /// <summary>
        /// Validates a JWT token and returns the associated user if valid.
        /// </summary>
        public async Task<User?> GetUserFromTokenAsync(string token)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(token))
                {
                    _logger.LogWarning("No token provided.");
                    return null;
                }

                // Remove "Bearer " if present
                if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = token.Substring(7);
                }

                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["AuthSettings:securityKey"]!);

                var parameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidIssuer = _configuration["AuthSettings:validIssuer"],
                    ValidAudience = _configuration["AuthSettings:validAudience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                var principal = tokenHandler.ValidateToken(token, parameters, out SecurityToken validatedToken);
                var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Token does not contain a valid user ID.");
                    return null;
                }

                // Fetch user from DB
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User ID from token not found in database.");
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError("Token validation failed: {Message}", ex.Message);
                return null;
            }
        }


        /// <summary>
        /// Generates a JWT token for authenticated users.
        /// </summary>
        private string GenerateToken(User user)
        {
            _logger.LogInformation("Generating JWT token for User: {Email}", user.Email);

            var authSettings = _configuration.GetSection("AuthSettings");
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(authSettings["securityKey"]!);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Aud, authSettings["validAudience"]!),
                new Claim(JwtRegisteredClaimNames.Iss, authSettings["validIssuer"]!),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, user.Name ?? ""),
                new Claim(ClaimTypes.NameIdentifier, user.Id ?? "")
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(1),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature
                )
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            _logger.LogInformation("JWT Token generated successfully for User: {Email}", user.Email);

            return tokenHandler.WriteToken(token);
        }
    }
}
