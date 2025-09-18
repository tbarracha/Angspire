using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SpireCore.API.Swagger.SwaggerControllerOrders;

public class VerbOrderOperationIdFilter : IOperationFilter
{
    static readonly string[] verbOrder = ["get", "post", "put", "patch", "delete", "options", "trace"];

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var verb = context.ApiDescription.HttpMethod?.ToLowerInvariant() ?? "";
        var idx = Array.IndexOf(verbOrder, verb);
        if (idx < 0) idx = int.MaxValue;

        // Prepend the method order to the operationId
        operation.OperationId = $"{idx:D2}_{operation.OperationId}";
    }
}

