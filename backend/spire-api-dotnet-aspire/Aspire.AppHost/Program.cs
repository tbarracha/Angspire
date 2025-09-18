// ================================
// File: Aspire.AppHost/Program.cs
// Quiet AppHost with safeguards
// ================================
var dist = DistributedApplication.CreateBuilder(args);

// Keep resiliency/debug env vars on the child for stability
dist.AddProject<Projects.Host>("host")
    .WithEnvironment("DOTNET_ReadyToRun", "0")
    .WithEnvironment("DOTNET_TieredPGO", "0");

// Optional: leave these OFF by default (uncomment only when diagnosing loader issues)
// .WithEnvironment("COREHOST_TRACE", "1")
// .WithEnvironment("COREHOST_TRACE_VERBOSITY", "3");

try
{
    dist.Build().Run();
}
catch
{
    // Preserve non-zero exit without noisy logging
    throw;
}
