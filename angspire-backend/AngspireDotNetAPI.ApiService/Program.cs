using AngspireDotNetAPI.ApiService.Core;
using AngspireDotNetAPI.ApiService.Core.Authentication.Models;
using AngspireDotNetAPI.ApiService.Core.Authentication.Services;
using AngspireDotNetAPI.ApiService.Core.Authentication.Controllers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Diagnostics;
using System.Text;

// Swagger: https://localhost:7361/swagger/index.html

var builder = WebApplication.CreateBuilder(args);

// Force-enable console logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Trace);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Read configuration for automatic migrations
var enableAutoMigrations = builder.Configuration.GetValue<bool>("DatabaseSettings:EnableAutoMigrations");

// Add DbContext with PostgreSQL
var identityDbConnectionString = builder.Configuration.GetConnectionString("IdentityConnection");

builder.Services.AddDbContext<AppIdentityDbContext>(options =>
    options.UseNpgsql(identityDbConnectionString));

// Add Identity services
builder.Services.AddIdentity<User, IdentityRole>()
    .AddEntityFrameworkStores<AppIdentityDbContext>()
    .AddDefaultTokenProviders();

// Configure JWT Authentication
var authSettings = builder.Configuration.GetSection("AuthSettings");

builder.Services.AddAuthentication(authOptions =>
{
    authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    authOptions.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(jwtOptions =>
{
    jwtOptions.RequireHttpsMetadata = false;
    jwtOptions.SaveToken = true;
    jwtOptions.TokenValidationParameters = new TokenValidationParameters
    {
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authSettings["securityKey"]!)),
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidateIssuer = true,
        ValidAudience = authSettings["validAudience"],
        ValidIssuer = authSettings["validIssuer"]
    };
});

// Register Authentication Services
builder.Services.AddScoped<AuthenticationService>();

// Add Controllers with Route Convention
builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new RouteTokenTransformerConvention(new SlugifyParameterTransformer()));
}).AddApplicationPart(typeof(AuthenticationController).Assembly);

// Add Problem Details Middleware
builder.Services.AddProblemDetails();

// Configure Swagger with JWT Authentication Support
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(swaggerOptions =>
{
    swaggerOptions.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme. 
                        Enter 'Bearer' [space] and then your token in the text input below.
                        Example: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    swaggerOptions.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "Bearer",
                Name = "Bearer",
                In = Microsoft.OpenApi.Models.ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

// Build the app
var app = builder.Build();

// Apply Database Migrations Conditionally
if (enableAutoMigrations)
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var identityDbContext = services.GetRequiredService<AppIdentityDbContext>();
            identityDbContext.Database.Migrate(); // Apply identity DB migrations

            // Ensure Admin User Exists
            var authService = services.GetRequiredService<AuthenticationService>();
            await authService.EnsureAdminUserAsync();

            Console.WriteLine("Admin user check complete.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred during startup: {ex.Message}");
        }
    }
}
else
{
    Console.WriteLine("Auto migrations are disabled via appsettings.json.");
}

// Global Exception Handler
app.UseExceptionHandler();

// Enable Swagger in Development Environment
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();

    // Automatically open Swagger UI in the default browser
    Task.Run(async () =>
    {
        await Task.Delay(1500);
        var url = app.Urls.FirstOrDefault() ?? "http://localhost:7361";
        var swaggerUrl = $"{url}/swagger";
        try
        {
            Console.WriteLine($"Opening Swagger UI at {swaggerUrl}");
            Process.Start(new ProcessStartInfo
            {
                FileName = swaggerUrl,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to open Swagger UI automatically: {ex.Message}");
        }
    });
}

// Configure CORS
app.UseCors(options =>
{
    options.AllowAnyOrigin();
    options.AllowAnyMethod();
    options.AllowAnyHeader();
});

// Enable Authentication & Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

// Map controller endpoints
app.MapControllers();

// Run the application
app.Run();
