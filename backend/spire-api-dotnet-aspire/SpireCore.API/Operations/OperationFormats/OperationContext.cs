namespace SpireCore.API.Operations;

using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public sealed class OperationContext
{
    public string? UserId { get; set; }
    public ClaimsPrincipal? Principal { get; set; }
    public HttpContext? HttpContext { get; set; }
    public string? CorrelationId { get; set; }

    public static OperationContext Empty { get; } = new OperationContext();
}