using Genspire.Application.Modules.GenAI.Providers.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;
using System.Linq.Expressions;

namespace Genspire.Application.Modules.GenAI.Providers.Operations;
#region --- DTOs -------------------
public class ProviderModelConfigDto
{
    public Guid Id { get; set; }
    public string ProviderName { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public List<Guid> SupportedTagIds { get; set; } = new();
    public List<string> SupportedTagNames { get; set; } = new();
    public string? ApiKey { get; set; }
    public string? ApiEndpoint { get; set; }
    public object? ReasoningEnable { get; set; }
    public object? ReasoningDisable { get; set; }
    public string? ReasoningOpenTag { get; set; }
    public string? ReasoningClosingTag { get; set; }
}

public class CreateProviderModelConfigRequest
{
    public string ProviderName { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public List<Guid>? SupportedTagIds { get; set; }
    public List<string>? SupportedTagNames { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiEndpoint { get; set; }
    public object? ReasoningEnable { get; set; }
    public object? ReasoningDisable { get; set; }
    public string? ReasoningOpenTag { get; set; }
    public string? ReasoningClosingTag { get; set; }
}

public class GetProviderModelConfigRequest
{
    public Guid Id { get; set; }
}

public class ListProviderModelConfigsRequest
{
    // Provider filters (nullable)
    public Guid? ProviderId { get; set; }
    public string? ProviderName { get; set; }
    // Tag filters (nullable)
    public Guid? TagId { get; set; }
    public string? TagName { get; set; }
}

public class UpdateProviderModelConfigRequest
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? ImageUrl { get; set; }
    public List<Guid>? SupportedTagIds { get; set; }
    public List<string>? SupportedTagNames { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiEndpoint { get; set; }
    public object? ReasoningEnable { get; set; }
    public object? ReasoningDisable { get; set; }
    public string? ReasoningOpenTag { get; set; }
    public string? ReasoningClosingTag { get; set; }
}

public class DeleteProviderModelConfigRequest
{
    public Guid Id { get; set; }
}

public class ProviderModelConfigResponse
{
    public ProviderModelConfigDto? Model { get; set; }

    public ProviderModelConfigResponse()
    {
    }

    public ProviderModelConfigResponse(ProviderModelConfigDto? model) => Model = model;
}

public class ProviderModelConfigsResponse
{
    public List<ProviderModelConfigDto> Models { get; set; } = new();

    public ProviderModelConfigsResponse()
    {
    }

    public ProviderModelConfigsResponse(List<ProviderModelConfigDto> models) => Models = models;
}

public class DeleteProviderModelConfigResponse
{
    public bool Success { get; set; }

    public DeleteProviderModelConfigResponse()
    {
    }

    public DeleteProviderModelConfigResponse(bool success) => Success = success;
}

#endregion
#region --- Mapper -----------------
public static class ProviderModelConfigMapper
{
    public static ProviderModelConfigDto ToDto(ProviderModel m) => new()
    {
        Id = m.Id,
        ProviderName = m.ProviderName,
        Name = m.Name,
        DisplayName = m.DisplayName,
        ImageUrl = m.ImageUrl,
        SupportedTagIds = m.SupportedTagIds ?? new(),
        SupportedTagNames = m.SupportedTagNames ?? new(),
        ApiKey = m.ApiKey,
        ApiEndpoint = m.ApiEndpoint,
        ReasoningEnable = m.ReasoningEnable,
        ReasoningDisable = m.ReasoningDisable,
        ReasoningOpenTag = m.ReasoningOpenTag,
        ReasoningClosingTag = m.ReasoningClosingTag
    };
}

#endregion
#region --- Operations -------------
[OperationGroup("GenAI Provider")]
[OperationRoute("provider/model/create")]
public sealed class CreateProviderModelConfigOperation : OperationBase<CreateProviderModelConfigRequest, ProviderModelConfigResponse>
{
    private readonly IRepository<ProviderModel> _repo;
    public CreateProviderModelConfigOperation(IRepository<ProviderModel> repo) => _repo = repo;
    protected override async Task<ProviderModelConfigResponse> HandleAsync(CreateProviderModelConfigRequest req)
    {
        var entity = new ProviderModel
        {
            Id = Guid.NewGuid(),
            ProviderName = req.ProviderName,
            Name = req.Name,
            DisplayName = req.DisplayName,
            ImageUrl = req.ImageUrl,
            SupportedTagIds = req.SupportedTagIds ?? new(),
            SupportedTagNames = req.SupportedTagNames ?? new(),
            ApiKey = req.ApiKey,
            ApiEndpoint = req.ApiEndpoint,
            ReasoningEnable = req.ReasoningEnable,
            ReasoningDisable = req.ReasoningDisable,
            ReasoningOpenTag = req.ReasoningOpenTag,
            ReasoningClosingTag = req.ReasoningClosingTag
        };
        await _repo.AddAsync(entity);
        return new ProviderModelConfigResponse(ProviderModelConfigMapper.ToDto(entity));
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/model/get")]
public sealed class GetProviderModelConfigOperation : OperationBase<GetProviderModelConfigRequest, ProviderModelConfigResponse>
{
    private readonly IRepository<ProviderModel> _repo;
    public GetProviderModelConfigOperation(IRepository<ProviderModel> repo) => _repo = repo;
    protected override async Task<ProviderModelConfigResponse> HandleAsync(GetProviderModelConfigRequest req)
    {
        var entity = await _repo.FindAsync(x => x.Id == req.Id);
        return new ProviderModelConfigResponse(entity is null ? null : ProviderModelConfigMapper.ToDto(entity));
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/model/list")]
public sealed class ListProviderModelConfigsOperation : OperationBase<ListProviderModelConfigsRequest, ProviderModelConfigsResponse>
{
    private readonly IRepository<ProviderModel> _modelRepo;
    private readonly IRepository<Provider> _providerRepo;
    public ListProviderModelConfigsOperation(IRepository<ProviderModel> modelRepo, IRepository<Provider> providerRepo)
    {
        _modelRepo = modelRepo;
        _providerRepo = providerRepo;
    }

    protected override async Task<ProviderModelConfigsResponse> HandleAsync(ListProviderModelConfigsRequest req)
    {
        // Resolve ProviderName from ProviderId if provided
        string? providerName = req.ProviderName;
        if (req.ProviderId.HasValue)
        {
            var provider = await _providerRepo.FindAsync(p => p.Id == req.ProviderId.Value);
            if (provider is null)
                return new ProviderModelConfigsResponse(new()); // No matching provider => empty result
            providerName = provider.Name;
        }

        // Build predicate (push down all filters)
        Expression<Func<ProviderModel, bool>> predicate = m => true;
        if (!string.IsNullOrWhiteSpace(providerName))
            predicate = predicate.And(m => m.ProviderName == providerName);
        if (req.TagId.HasValue)
            predicate = predicate.And(m => m.SupportedTagIds != null && m.SupportedTagIds.Contains(req.TagId.Value));
        if (!string.IsNullOrWhiteSpace(req.TagName))
            predicate = predicate.And(m => m.SupportedTagNames != null && m.SupportedTagNames.Contains(req.TagName!));
        var filtered = await _modelRepo.FindAllAsync(predicate);
        var list = filtered.Select(ProviderModelConfigMapper.ToDto).ToList();
        return new ProviderModelConfigsResponse(list);
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/model/update")]
public sealed class UpdateProviderModelConfigOperation : OperationBase<UpdateProviderModelConfigRequest, ProviderModelConfigResponse>
{
    private readonly IRepository<ProviderModel> _repo;
    public UpdateProviderModelConfigOperation(IRepository<ProviderModel> repo) => _repo = repo;
    protected override async Task<ProviderModelConfigResponse> HandleAsync(UpdateProviderModelConfigRequest req)
    {
        var entity = await _repo.FindAsync(x => x.Id == req.Id);
        if (entity == null)
            return new ProviderModelConfigResponse(null);
        if (req.DisplayName != null)
            entity.DisplayName = req.DisplayName;
        if (req.ImageUrl != null)
            entity.ImageUrl = req.ImageUrl;
        if (req.SupportedTagIds != null)
            entity.SupportedTagIds = req.SupportedTagIds;
        if (req.SupportedTagNames != null)
            entity.SupportedTagNames = req.SupportedTagNames;
        if (req.ApiKey != null)
            entity.ApiKey = req.ApiKey;
        if (req.ApiEndpoint != null)
            entity.ApiEndpoint = req.ApiEndpoint;
        if (req.ReasoningEnable != null)
            entity.ReasoningEnable = req.ReasoningEnable;
        if (req.ReasoningDisable != null)
            entity.ReasoningDisable = req.ReasoningDisable;
        if (req.ReasoningOpenTag != null)
            entity.ReasoningOpenTag = req.ReasoningOpenTag;
        if (req.ReasoningClosingTag != null)
            entity.ReasoningClosingTag = req.ReasoningClosingTag;
        await _repo.UpdateAsync(x => x.Id == req.Id, entity);
        return new ProviderModelConfigResponse(ProviderModelConfigMapper.ToDto(entity));
    }
}

[OperationGroup("GenAI Provider")]
[OperationRoute("provider/model/delete")]
public sealed class DeleteProviderModelConfigOperation : OperationBase<DeleteProviderModelConfigRequest, DeleteProviderModelConfigResponse>
{
    private readonly IRepository<ProviderModel> _repo;
    public DeleteProviderModelConfigOperation(IRepository<ProviderModel> repo) => _repo = repo;
    protected override async Task<DeleteProviderModelConfigResponse> HandleAsync(DeleteProviderModelConfigRequest req)
    {
        await _repo.DeleteAsync(x => x.Id == req.Id);
        return new DeleteProviderModelConfigResponse(true);
    }
}
#endregion
