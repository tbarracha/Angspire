// -----------
// Auth
// -----------

// Create a new migration for AuthDbContext
dotnet ef migrations add <MigrationName> --context AuthDbContext --output-dir Migrations/Auth --project Genspire.Infrastructure --startup-project Genspire.Host


// Update the Auth database schema
dotnet ef database update --context AuthDbContext --project Genspire.Infrastructure --startup-project Genspire.Host

// List AuthDbContext migrations
dotnet ef migrations list --context AuthDbContext --project Genspire.Infrastructure --startup-project Genspire.Host
