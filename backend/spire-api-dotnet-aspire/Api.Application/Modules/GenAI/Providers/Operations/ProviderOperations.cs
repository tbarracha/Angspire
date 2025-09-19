using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.GenAI.Providers.Operations;
// --- DTOs ------------------
public class ProviderDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public List<Guid> SupportedTagIds { get; set; } = new();
    public List<string> SupportedTagNames { get; set; } = new();
    public string? ApiBaseUrl { get; set; }
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public List<ProviderModelConfigDto> Models { get; set; } = new();
}

// --- Requests/Responses ----------------
public class CreateProviderRequest
{
    public string Name { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public List<Guid>? SupportedTagIds { get; set; }
    public List<string>? SupportedTagNames { get; set; }
    public string? ApiBaseUrl { get; set; }
    public bool Enabled { get; set; } = true;
    public string? ApiKey { get; set; }
    public List<CreateProviderModelConfigRequest>? Models { get; set; }
}

public class GetProviderRequest
{
    public Guid Id { get; set; }
}

public class ListProvidersRequest
{
    public bool? OnlyEnabled { get; set; }
}

public class UpdateProviderRequest
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public List<Guid>? SupportedTagIds { get; set; }
    public List<string>? SupportedTagNames { get; set; }
    public string? ApiBaseUrl { get; set; }
    public bool? Enabled { get; set; }
    public string? ApiKey { get; set; }
    public List<ProviderModelConfigDto>? Models { get; set; }
}

public class DeleteProviderRequest
{
    public Guid Id { get; set; }
}

public class ProviderResponse
{
    public ProviderDto? Provider { get; set; }
}

public class ProvidersResponse
{
    public List<ProviderDto> Providers { get; set; } = new();
}

public class DeleteProviderResponse
{
    public bool Success { get; set; }

    public DeleteProviderResponse()
    {
    }

    public DeleteProviderResponse(bool success) => Success = success;
}

// --- Mappers ------------------------
public static class ProviderMapper
{
    public static ProviderDto ToDto(Provider entity) => new ProviderDto
    {
        Id = entity.Id,
        Name = entity.Name,
        DisplayName = entity.DisplayName,
        ImageUrl = entity.ImageUrl,
        Description = entity.Description,
        SupportedTagIds = entity.SupportedTagIds ?? new(),
        SupportedTagNames = entity.SupportedTagNames ?? new(),
        ApiBaseUrl = entity.ApiBaseUrl,
        Enabled = entity.Enabled,
        ApiKey = entity.ApiKey,
        Models = entity.Models.Select(ProviderModelConfigMapper.ToDto).ToList()
    };
}

// --- Operations --------------------------
[OperationGroup("GenAI Provider")]
[OperationRoute("provider/create")]
public sealed class CreateProviderOperation : OperationBase<CreateProviderRequest, ProviderResponse>
{
    private readonly IRepository<Provider> _repo;
    public CreateProviderOperation(IRepository<Provider> repo) => _repo = repo;
    protected override async Task<ProviderResponse> HandleAsync(CreateProviderRequest request)
    {
        var entity = new Provider
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            DisplayName = request.DisplayName,
            ImageUrl = request.ImageUrl,
            Description = request.Description,
            SupportedTagIds = request.SupportedTagIds ?? new(),
            SupportedTagNames = request.SupportedTagNames ?? new(),
            ApiBaseUrl = request.ApiBaseUrl,
            Enabled = request.Enabled,
            ApiKey = request.ApiKey,
            Models = request.Models?.Select(m => new ProviderModel { Id = Guid.NewGuid(), ProviderName = m.ProviderName, Name = m.Name, DisplayName = m.DisplayName, ImageUrl = m.ImageUrl, SupportedTagIds = m.SupportedTagIds ?? new(), SupportedTagNames = m.SupportedTagNames ?? new(), ApiKey = m.ApiKey, ApiEndpoint = m.ApiEndpoint, ReasoningEnable = m.ReasoningEnable, ReasoningDisable = m.ReasoningDisable, ReasoningOpenTag = m.ReasoningOpenTag, ReasoningClosingTag = m.ReasoningClosingTag }).ToList() ?? new()
        };
        await _repo.AddAsync(entity);
        return new ProviderResponse
        {
            Provider = ProviderMapper.ToDto(entity)
        };
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/get")]
public sealed class GetProviderOperation : OperationBase<GetProviderRequest, ProviderResponse>
{
    private readonly IRepository<Provider> _repo;
    public GetProviderOperation(IRepository<Provider> repo) => _repo = repo;
    protected override async Task<ProviderResponse> HandleAsync(GetProviderRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new ProviderResponse
        {
            Provider = entity is null ? null : ProviderMapper.ToDto(entity)
        };
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/list")]
public sealed class ListProvidersOperation : OperationBase<ListProvidersRequest, ProvidersResponse>
{
    private readonly IRepository<Provider> _repo;
    public ListProvidersOperation(IRepository<Provider> repo) => _repo = repo;
    protected override async Task<ProvidersResponse> HandleAsync(ListProvidersRequest request)
    {
        var query = await _repo.GetAllAsync();
        if (request.OnlyEnabled == true)
            query = query.Where(x => x.Enabled);
        var list = query.Select(ProviderMapper.ToDto).ToList();
        return new ProvidersResponse
        {
            Providers = list
        };
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/update")]
public sealed class UpdateProviderOperation : OperationBase<UpdateProviderRequest, ProviderResponse>
{
    private readonly IRepository<Provider> _repo;
    public UpdateProviderOperation(IRepository<Provider> repo) => _repo = repo;
    protected override async Task<ProviderResponse> HandleAsync(UpdateProviderRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new ProviderResponse
            {
                Provider = null
            };
        if (request.DisplayName != null)
            entity.DisplayName = request.DisplayName;
        if (request.ImageUrl != null)
            entity.ImageUrl = request.ImageUrl;
        if (request.Description != null)
            entity.Description = request.Description;
        if (request.SupportedTagIds != null)
            entity.SupportedTagIds = request.SupportedTagIds;
        if (request.SupportedTagNames != null)
            entity.SupportedTagNames = request.SupportedTagNames;
        if (request.ApiBaseUrl != null)
            entity.ApiBaseUrl = request.ApiBaseUrl;
        if (request.Enabled.HasValue)
            entity.Enabled = request.Enabled.Value;
        if (request.ApiKey != null)
            entity.ApiKey = request.ApiKey;
        if (request.Models != null)
        {
            // Full replace for simplicity
            entity.Models = request.Models.Select(m => new ProviderModel { Id = m.Id, ProviderName = m.ProviderName, Name = m.Name, DisplayName = m.DisplayName, ImageUrl = m.ImageUrl, SupportedTagIds = m.SupportedTagIds ?? new(), SupportedTagNames = m.SupportedTagNames ?? new(), ApiKey = m.ApiKey, ApiEndpoint = m.ApiEndpoint, ReasoningEnable = m.ReasoningEnable, ReasoningDisable = m.ReasoningDisable, ReasoningOpenTag = m.ReasoningOpenTag, ReasoningClosingTag = m.ReasoningClosingTag }).ToList();
        }

        await _repo.UpdateAsync(x => x.Id == request.Id, entity);
        return new ProviderResponse
        {
            Provider = ProviderMapper.ToDto(entity)
        };
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/delete")]
public sealed class DeleteProviderOperation : OperationBase<DeleteProviderRequest, DeleteProviderResponse>
{
    private readonly IRepository<Provider> _repo;
    public DeleteProviderOperation(IRepository<Provider> repo) => _repo = repo;
    protected override async Task<DeleteProviderResponse> HandleAsync(DeleteProviderRequest request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteProviderResponse(true);
    }
}