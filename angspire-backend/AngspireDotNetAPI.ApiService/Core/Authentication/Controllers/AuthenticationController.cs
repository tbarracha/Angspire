using AngspireDotNetAPI.ApiService.Core.Authentication.ViewModels;
using AngspireDotNetAPI.ApiService.Core.Authentication.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AngspireDotNetAPI.ApiService.Core.Authentication.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthenticationController : ControllerBase
    {
        private readonly AuthenticationService _authService;
        private readonly ILogger<AuthenticationController> _logger;

        public AuthenticationController(AuthenticationService authService, ILogger<AuthenticationController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Registers a new user.
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest model)
        {
            _logger.LogInformation("Register attempt for Email: {Email}", model.Email);
            var response = await _authService.RegisterAsync(model);

            if (!response.Result)
            {
                _logger.LogWarning("Registration failed for Email: {Email}. Errors: {Errors}",
                    model.Email, response.Errors != null ? string.Join(", ", response.Errors) : "None");
            }

            return response.Result ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Logs in an existing user.
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest model)
        {
            _logger.LogInformation("Login attempt for Email: {Email}", model.Email);
            var response = await _authService.LoginAsync(model);

            if (!response.Result)
            {
                _logger.LogWarning("Login failed for Email: {Email}", model.Email);
            }
            else
            {
                _logger.LogInformation("Login successful for Email: {Email}", model.Email);
            }

            return response.Result ? Ok(response) : Unauthorized(response);
        }

        /// <summary>
        /// Retrieves all users (requires authentication).
        /// </summary>
        [Authorize]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            _logger.LogInformation("GET /api/auth/users endpoint hit.");

            // Log user claims from the JWT token
            if (User.Identity?.IsAuthenticated ?? false)
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                _logger.LogInformation("Authenticated request from UserId: {UserId}, Email: {Email}", userId, userEmail);
            }
            else
            {
                _logger.LogWarning("Unauthorized access attempt to /api/auth/users");
            }

            var users = await _authService.GetAllUsersAsync();
            return Ok(users);
        }
    }
}
