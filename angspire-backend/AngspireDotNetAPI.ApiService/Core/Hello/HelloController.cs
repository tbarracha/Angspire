using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AngspireDotNetAPI.ApiService.Core.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HelloController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetHello()
        {
            Console.WriteLine("GetHello endpoint invoked.");
            return Ok("Hello from Angspire API!");
        }

        [Authorize]
        [HttpGet("auth")]
        public IActionResult HelloAuth()
        {
            // Log all claims for debugging purposes
            Console.WriteLine("HelloAuth endpoint invoked. User claims:");
            foreach (var claim in User.Claims)
            {
                Console.WriteLine($"Type: {claim.Type}, Value: {claim.Value}");
            }

            // Use User.Identity.Name which should now be correctly populated
            var userName = User.Identity?.Name ?? "Unknown User";
            string responseMessage = $"Hello, {userName}! You are authenticated.";
            Console.WriteLine($"Returning response: {responseMessage}");
            return Ok(responseMessage);
        }
    }
}
