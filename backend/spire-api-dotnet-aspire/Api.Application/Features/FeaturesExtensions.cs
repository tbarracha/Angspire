using Microsoft.Extensions.DependencyInjection;
using SpireCore.API.Configuration.Features;

namespace Genspire.Application.Features;
public static class FeaturesExtensions
{
    public static void AddEnabledFeatures(this IServiceCollection services, FeaturesConfigurationList features)
    {
        if (features.TryGetValue("EmailNotifications", out var emailFeature) && emailFeature.Enabled)
        {
            // Example: services.AddEmailNotificationService();
        }

        if (features.TryGetValue("AdvancedSearch", out var searchFeature) && searchFeature.Enabled)
        {
            // Example: services.AddAdvancedSearchService();
        }
        // Add other feature hooks here as needed
    }
}