var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.AngspireDotNetAPI_ApiService>("apiservice");

builder.AddNpmApp("angular", "../../angspire-frontend")
    .WithReference(apiService)
    .WaitFor(apiService)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
