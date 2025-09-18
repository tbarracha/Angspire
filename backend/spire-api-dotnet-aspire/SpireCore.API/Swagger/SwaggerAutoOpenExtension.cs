using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using SpireCore.API.Swagger.SwaggerControllerOrders;
using System.Diagnostics;

namespace SpireCore.API.Swagger;

public static class SwaggerAutoOpenExtension
{
    /// <summary>Adds Swagger and wires controller ordering.</summary>
    public static IServiceCollection AddOpenApi(
        this IServiceCollection services,
        string apiTitle = "API",
        string apiDescription = "HTTP API",
        string apiVersion = "v1")
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(opt =>
        {
            opt.SwaggerDoc(apiVersion, new OpenApiInfo
            {
                Title = apiTitle,
                Version = apiVersion,
                Description = apiDescription
            });

            // JWT bearer input (optional)
            opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer",
                In = ParameterLocation.Header,
                Description = "Enter 'Bearer &lt;JWT token&gt;'"
            });
            opt.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id   = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            // Controller-group ordering
            opt.DocumentFilter<CustomSwaggerDocumentFilter>();
            opt.TagActionsBy(api =>
                new[] { api.GroupName ?? api.ActionDescriptor.RouteValues["controller"] });

            // Method ordering inside each tag
            string[] verbOrder =
                ["get", "post", "put", "patch", "delete", "options", "trace"];

            opt.OrderActionsBy(api =>
            {
                var verb = api.HttpMethod?.ToLowerInvariant() ?? string.Empty;
                var idx = Array.IndexOf(verbOrder, verb);
                if (idx < 0) idx = int.MaxValue;
                return $"{api.ActionDescriptor.RouteValues["controller"]}_{idx:D2}";
            });
        });

        return services;
    }

    /// <summary>Enable Swagger and (optionally) auto-open the UI.</summary>
    public static void UseOpenApi(
        this WebApplication app,
        string endpointName = "API",
        string apiVersion = "v1",
        bool autoOpen = false)
    {
        app.UseSwagger();
        app.UseSwaggerUI(opt =>
        {
            opt.SwaggerEndpoint($"/swagger/{apiVersion}/swagger.json", $"{endpointName} {apiVersion}");
            opt.RoutePrefix = string.Empty; // root
        });

        if (app.Environment.IsDevelopment())
        {
            if (autoOpen)
                app.OpenSwaggerUI();

            app.MapGet("/", ctx =>
            {
                ctx.Response.Redirect("/swagger");
                return Task.CompletedTask;
            });
        }
    }

    /// <summary>Launches the default browser pointing at the root of the app.</summary>
    public static void OpenSwaggerUI(this IApplicationBuilder app, int delayMs = 1500)
    {
        Task.Run(async () =>
        {
            await Task.Delay(delayMs);
            var serverAddresses = app.ServerFeatures
                .Get<Microsoft.AspNetCore.Hosting.Server.Features.IServerAddressesFeature>()?.Addresses;
            var url = serverAddresses?.FirstOrDefault() ?? "http://localhost:5000/";
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
        });
    }
}

