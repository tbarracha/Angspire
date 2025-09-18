namespace SpireCore.API.Swagger.SwaggerControllerOrders;

/// <summary>
/// Apply to a controller to specify the order it should appear in Swagger UI.
/// Lower numbers are shown first.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public sealed class SwaggerControllerOrderAttribute : Attribute
{
    public int Order { get; }

    public SwaggerControllerOrderAttribute(int order) => Order = order;
}

