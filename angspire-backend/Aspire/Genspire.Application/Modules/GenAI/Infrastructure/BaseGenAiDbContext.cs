using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using Genspire.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Genspire.Application.Modules.GenAI.Infrastructure;
public class BaseGenAiDbContext : DomainDbContext
{
    public BaseGenAiDbContext(DbContextOptions options) : base(options)
    {
    }

    // Optionally: Settings details (if you ever want to query or update them directly)
    public DbSet<TextGenerationSettings> TextGenerationSettings { get; set; }
    public DbSet<ReasoningSettings> ReasoningSettings { get; set; }
    public DbSet<AudioGenerationSettings> AudioGenerationSettings { get; set; }
    public DbSet<ImageGenerationSettings> ImageGenerationSettings { get; set; }
    public DbSet<VideoGenerationSettings> VideoGenerationSettings { get; set; }
    public DbSet<EmbeddingSettings> EmbeddingSettings { get; set; }
    public DbSet<ToolSettings> ToolSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Add any custom model configuration here (e.g., table names, keys, relationships)
        // Example:
        // modelBuilder.Entity<InteractionSession>().ToTable("InteractionSessions");
        // You should configure abstract base classes and TPH/TP-join inheritance here as needed.
    }
}