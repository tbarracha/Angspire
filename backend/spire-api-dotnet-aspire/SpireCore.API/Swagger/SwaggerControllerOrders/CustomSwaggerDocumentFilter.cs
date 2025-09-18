using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Reflection;

namespace SpireCore.API.Swagger.SwaggerControllerOrders;

/// <summary>
/// Re-orders the swagger <c>tags</c> list so that groups (controllers)
/// appear in the UI according to <see cref="SwaggerControllerOrderAttribute"/>.
/// </summary>
public sealed class CustomSwaggerDocumentFilter : IDocumentFilter
{
    private static readonly SwaggerControllerOrder _order =
        new SwaggerControllerOrder(
            SwaggerControllerOrder.DiscoverControllers(Assembly.GetEntryAssembly()));

    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        var tags = context.ApiDescriptions
                          .Select(d => d.ActionDescriptor.RouteValues["controller"])
                          .Where(c => !string.IsNullOrWhiteSpace(c))
                          .Distinct(StringComparer.OrdinalIgnoreCase)
                          .OrderBy(c => _order.SortKey(c!))
                          .Select(c => new OpenApiTag { Name = c })
                          .ToList();

        swaggerDoc.Tags = tags;
    }
}

