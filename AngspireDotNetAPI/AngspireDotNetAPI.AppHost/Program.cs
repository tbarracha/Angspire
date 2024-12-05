var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.AngspireDotNetAPI_ApiService>("apiservice");

builder.Build().Run();
