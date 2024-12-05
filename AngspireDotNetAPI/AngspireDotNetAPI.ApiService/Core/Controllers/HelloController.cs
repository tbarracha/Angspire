using Microsoft.AspNetCore.Http;
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
            return Ok("Hello from Angspire API!");
        }
    }
}
