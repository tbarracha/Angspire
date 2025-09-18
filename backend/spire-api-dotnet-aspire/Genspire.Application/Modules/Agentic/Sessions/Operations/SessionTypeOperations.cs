using Genspire.Application.Modules.Agentic.Sessions.Contracts;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;

// --- Requests / Responses ---
public class CreateSessionTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemType { get; set; } = false;
    public bool IsDefault { get; set; } = false;
}

public class GetSessionTypeRequest
{
    public string Id { get; set; } = default!;
}

public class ListSessionTypesRequest
{
    public bool? IsSystemType { get; set; }
}

public class UpdateSessionTypeRequest
{
    public string Id { get; set; } = default!;
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsSystemType { get; set; }
    public bool? IsDefault { get; set; }
}

public class DeleteSessionTypeRequest
{
    public string Id { get; set; } = default!;
}

public class SessionTypeResponse
{
    public SessionTypeDto? SessionType { get; set; }

    public SessionTypeResponse()
    {
    }

    public SessionTypeResponse(SessionTypeDto? type) => SessionType = type;
}

public class SessionTypesResponse
{
    public List<SessionTypeDto> SessionTypes { get; set; } = new();

    public SessionTypesResponse()
    {
    }

    public SessionTypesResponse(List<SessionTypeDto> types) => SessionTypes = types;
}

public class DeleteSessionTypeResponse
{
    public bool Success { get; set; }

    public DeleteSessionTypeResponse()
    {
    }

    public DeleteSessionTypeResponse(bool success) => Success = success;
}

// --- Mapper ---
public static class SessionTypeMapper
{
    public static SessionTypeDto ToDto(SessionType e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        Description = e.Description,
        IsSystemType = e.IsSystemType,
        IsDefault = e.IsDefault
    };
}

// --- Operations ---
[OperationRoute("session/type/create")]
public sealed class CreateSessionTypeOperation : OperationBase<CreateSessionTypeRequest, SessionTypeResponse>
{
    private readonly IRepository<SessionType> _repo;
    public CreateSessionTypeOperation(IRepository<SessionType> repo) => _repo = repo;
    protected override async Task<SessionTypeResponse> HandleAsync(CreateSessionTypeRequest request)
    {
        var entity = new SessionType
        {
            Name = request.Name,
            Description = request.Description,
            IsSystemType = request.IsSystemType,
            IsDefault = request.IsDefault
        };
        await _repo.AddAsync(entity);
        return new SessionTypeResponse(SessionTypeMapper.ToDto(entity));
    }
}

[OperationRoute("session/type/get")]
public sealed class GetSessionTypeOperation : OperationBase<GetSessionTypeRequest, SessionTypeResponse>
{
    private readonly IRepository<SessionType> _repo;
    public GetSessionTypeOperation(IRepository<SessionType> repo) => _repo = repo;
    protected override async Task<SessionTypeResponse> HandleAsync(GetSessionTypeRequest request)
    {
        if (!Guid.TryParse(request.Id, out var id))
            return new SessionTypeResponse(null);
        var entity = await _repo.FindAsync(x => x.Id == id);
        return new SessionTypeResponse(entity == null ? null : SessionTypeMapper.ToDto(entity));
    }
}

[OperationRoute("session/type/list")]
public sealed class ListSessionTypesOperation : OperationBase<ListSessionTypesRequest, SessionTypesResponse>
{
    private readonly IRepository<SessionType> _repo;
    public ListSessionTypesOperation(IRepository<SessionType> repo) => _repo = repo;
    protected override async Task<SessionTypesResponse> HandleAsync(ListSessionTypesRequest request)
    {
        var all = await _repo.GetAllAsync();
        IEnumerable<SessionType> query = all;
        if (request.IsSystemType.HasValue)
            query = query.Where(x => x.IsSystemType == request.IsSystemType.Value);
        var list = query.Select(SessionTypeMapper.ToDto).ToList();
        return new SessionTypesResponse(list);
    }
}

[OperationRoute("session/type/update")]
public sealed class UpdateSessionTypeOperation : OperationBase<UpdateSessionTypeRequest, SessionTypeResponse>
{
    private readonly IRepository<SessionType> _repo;
    public UpdateSessionTypeOperation(IRepository<SessionType> repo) => _repo = repo;
    protected override async Task<SessionTypeResponse> HandleAsync(UpdateSessionTypeRequest request)
    {
        if (!Guid.TryParse(request.Id, out var id))
            return new SessionTypeResponse(null);
        var entity = await _repo.FindAsync(x => x.Id == id);
        if (entity == null)
            return new SessionTypeResponse(null);
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.Description != null)
            entity.Description = request.Description;
        if (request.IsSystemType.HasValue)
            entity.IsSystemType = request.IsSystemType.Value;
        if (request.IsDefault.HasValue)
            entity.IsDefault = request.IsDefault.Value;
        await _repo.UpdateAsync(x => x.Id == id, entity);
        return new SessionTypeResponse(SessionTypeMapper.ToDto(entity));
    }
}

[OperationRoute("session/type/delete")]
public sealed class DeleteSessionTypeOperation : OperationBase<DeleteSessionTypeRequest, DeleteSessionTypeResponse>
{
    private readonly IRepository<SessionType> _repo;
    public DeleteSessionTypeOperation(IRepository<SessionType> repo) => _repo = repo;
    protected override async Task<DeleteSessionTypeResponse> HandleAsync(DeleteSessionTypeRequest request)
    {
        if (!Guid.TryParse(request.Id, out var id))
            return new DeleteSessionTypeResponse(false);
        var result = await _repo.DeleteAsync(x => x.Id == id);
        return new DeleteSessionTypeResponse(result != null);
    }
}