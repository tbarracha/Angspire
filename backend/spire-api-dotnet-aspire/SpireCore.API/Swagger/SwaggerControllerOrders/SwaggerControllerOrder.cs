using System.Reflection;

namespace SpireCore.API.Swagger.SwaggerControllerOrders;

/// <summary>
/// Builds a lookup (controller-name ? sort-order) by scanning assemblies
/// for controllers that carry <see cref="SwaggerControllerOrderAttribute"/>.
/// </summary>
public sealed class SwaggerControllerOrder
{
    private readonly Dictionary<string, int> _orderLookup;

    public SwaggerControllerOrder(IEnumerable<Type> controllerTypes)
    {
        _orderLookup = controllerTypes
            .Select(t =>
            {
                var attr = t.GetCustomAttribute<SwaggerControllerOrderAttribute>();
                var order = attr?.Order ?? int.MaxValue;
                return new
                {
                    Name = ResolveControllerName(t.Name),
                    Order = order
                };
            })
            .ToDictionary(x => x.Name, x => x.Order, StringComparer.OrdinalIgnoreCase);
    }


    public int GetOrder(string controllerName) =>
        _orderLookup.TryGetValue(controllerName, out var order) ? order : int.MaxValue;

    public string SortKey(string controllerName) =>
        $"{GetOrder(controllerName):D10}_{controllerName}";

    /// <summary>Controller types == *public* classes that end with "Controller".</summary>
    public static IEnumerable<Type> DiscoverControllers(Assembly? assembly)
    {
        return (assembly ?? Assembly.GetExecutingAssembly())
               .GetExportedTypes()
               .Where(t => t.IsClass && t.Name.EndsWith("Controller", StringComparison.OrdinalIgnoreCase));
    }

    private static string ResolveControllerName(string name) =>
        name.EndsWith("Controller", StringComparison.OrdinalIgnoreCase)
            ? name[..^"Controller".Length]
            : name;
}

