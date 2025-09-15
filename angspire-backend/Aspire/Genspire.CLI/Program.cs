using Genspire.CLI.CommandManagers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SpireCore.API.Configuration.Features;
using SpireCore.API.Configuration.Modules;
using SpireCore.Services;

var builder = Host.CreateApplicationBuilder(args);

// 1) Bind Modules/Features from config
builder.Services.Configure<ModulesConfigurationList>(
    builder.Configuration.GetSection("Modules"));
builder.Services.Configure<FeaturesConfigurationList>(
    builder.Configuration.GetSection("Features"));

// 2) Register module database provider so Mongo repos work
builder.Services.AddSingleton<IModuleDatabaseProvider, ModuleDatabaseProvider>();

// 3) Register your normal services/repos
builder.Services.AddApplicationServices();
builder.Services.AddApplicationRepositories(builder.Configuration);

// Make IConfiguration injectable
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);

using var host = builder.Build();
var provider = host.Services;

// (Optional) Verify that GenAi module loaded
var modules = provider.GetRequiredService<IOptions<ModulesConfigurationList>>().Value;
if (modules.TryGetValue("GenAi", out var m))
{
    Console.WriteLine($"GenAi Enabled: {m.Enabled}, Provider: {m.DbConnection.Provider}");
}
else
{
    Console.WriteLine("GenAi module not found in configuration.");
}

var config = provider.GetRequiredService<IConfiguration>();
var manager = GenspireCommandManagerBuilder.BuildCommandManager(config, provider);

if (args.Length == 0)
    args = new[] { "--interactive" };

return manager.Run(args).ExitCode;
