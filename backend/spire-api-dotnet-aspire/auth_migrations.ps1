# auth_migrations.ps1
<#
USAGE
  PowerShell:
    # From repo root (where the csproj paths below resolve)
    .\auth_migrations.ps1 -Action add -Name InitialAuth -Profile hostdev
    .\auth_migrations.ps1 -Action update -Profile hostdev
    .\auth_migrations.ps1 -Action list
    .\auth_migrations.ps1 -Action remove
    .\auth_migrations.ps1 -Action drop
    .\auth_migrations.ps1 -Action reset -Profile local

ACTIONS
  -Action add    : Add a new migration (requires -Name)
  -Action update : Apply migrations to the target database
  -Action list   : List existing migrations
  -Action remove : Remove the last migration (no DB change)
  -Action drop   : Drop the target database (destructive)
  -Action reset  : Drop + re-apply migrations (destructive)

PARAMETERS
  -Name        : Migration name (required for -Action add)
  -Profile     : Db profile to use (maps to your appsettings.json -> DbSettings.Profile[s])
                 e.g. hostdev | dev | local | remote (default: hostdev)
  -Context     : EF DbContext class name (default: AuthDbContext)
  -ProjectPath : Path to the DbContext project (.csproj with the DbContext)
  -StartupPath : Path to the startup/host project (the one that reads appsettings and builds DI)

PREREQUISITES
  1) EF Core tools available:
       dotnet tool install -g dotnet-ef
     or if you use local tools:
       dotnet tool restore
  2) Your Host app must read DB_PROFILE (env var) to select the correct connection string.
  3) Target DB is reachable (e.g., run docker compose for Postgres: `docker compose up -d angspire-auth`).
  4) Run from a location where the default -ProjectPath and -StartupPath resolve, or override them.

NOTES
  - You do NOT need a new migration for a database name change alone; only when the model changes.
  - This script sets:
      DB_PROFILE=Profile (so the Host picks the right block)
      ASPNETCORE_ENVIRONMENT=Development
#>

param(
  [ValidateSet("add","update","remove","list","drop","reset")]
  [string]$Action = "add",
  [string]$Name = "InitialAuth",
  [string]$Profile = "hostdev",
  [string]$Context = "AuthDbContext",
  [string]$ProjectPath = ".\Authentication\Authentication.csproj",
  [string]$StartupPath = ".\Host\Host.csproj"
)

# Ensure the Host resolves the intended profile/connection
$env:DB_PROFILE = $Profile
$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host ">>> Action: $Action | Profile: $Profile | Context: $Context"
Write-Host ">>> Project: $ProjectPath"
Write-Host ">>> Startup: $StartupPath"

switch ($Action) {
  "add" {
    if (-not $Name) { throw "You must provide -Name for Action=add" }
    Write-Host ">>> Adding migration '$Name'"
    dotnet ef migrations add $Name -c $Context -p $ProjectPath -s $StartupPath
  }
  "update" {
    Write-Host ">>> Updating database"
    dotnet ef database update -c $Context -p $ProjectPath -s $StartupPath
  }
  "remove" {
    Write-Host ">>> Removing last migration (no DB changes)"
    dotnet ef migrations remove -c $Context -p $ProjectPath -s $StartupPath
  }
  "list" {
    Write-Host ">>> Listing migrations"
    dotnet ef migrations list -c $Context -p $ProjectPath -s $StartupPath
  }
  "drop" {
    Write-Host ">>> Dropping database (destructive)"
    dotnet ef database drop -f -c $Context -p $ProjectPath -s $StartupPath
  }
  "reset" {
    Write-Host ">>> Resetting database (drop + update) (destructive)"
    dotnet ef database drop -f -c $Context -p $ProjectPath -s $StartupPath
    dotnet ef database update -c $Context -p $ProjectPath -s $StartupPath
  }
  default { throw "Unknown action: $Action" }
}
