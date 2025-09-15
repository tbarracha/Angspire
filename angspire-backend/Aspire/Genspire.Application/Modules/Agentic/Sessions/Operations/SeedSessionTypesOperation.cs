using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;
public class SeedSessionTypesRequest
{
    public bool OverwriteExisting { get; set; } = false;
}

public class SeedSessionTypesResponse
{
    public int TypesSeeded { get; set; }
}

[OperationGroup("Dev")]
[OperationRoute("session-type/seed")]
public sealed class SeedSessionTypesOperation : OperationBase<SeedSessionTypesRequest, SeedSessionTypesResponse>
{
    private readonly IRepository<SessionType> _typeRepo;
    public SeedSessionTypesOperation(IRepository<SessionType> typeRepo)
    {
        _typeRepo = typeRepo;
    }

    // Built-in system types
    private static readonly SessionType[] BuiltInTypes = [new SessionType
    {
        Name = "chat",
        Description = "Standard chat session",
        IsSystemType = true,
        IsDefault = true
    }, new SessionType
    {
        Name = "tool",
        Description = "Tool execution session",
        IsSystemType = true,
        IsDefault = false
    }, new SessionType
    {
        Name = "workflow",
        Description = "Workflow orchestration session",
        IsSystemType = true,
        IsDefault = false
    }

    ];
    protected override async Task<SeedSessionTypesResponse> HandleAsync(SeedSessionTypesRequest request)
    {
        int typesSeeded = 0;
        foreach (var type in BuiltInTypes)
        {
            var existing = await _typeRepo.FindAsync(x => x.Name == type.Name);
            if (existing != null)
            {
                if (request.OverwriteExisting)
                {
                    type.Id = existing.Id;
                    await _typeRepo.UpdateAsync(x => x.Name == type.Name, type);
                    typesSeeded++;
                }
                else
                {
                    continue; // skip existing
                }
            }
            else
            {
                type.Id = Guid.NewGuid();
                await _typeRepo.AddAsync(type);
                typesSeeded++;
            }
        }

        return new SeedSessionTypesResponse
        {
            TypesSeeded = typesSeeded
        };
    }
}