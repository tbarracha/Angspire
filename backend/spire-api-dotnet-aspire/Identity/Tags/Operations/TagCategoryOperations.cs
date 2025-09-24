using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations;
using SpireCore.Repositories;
using Identity.Tags.Models;

namespace Identity.Tags.Operations;

// DTOs
public class TagCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? IconType { get; set; }
    public Guid? ParentCategoryId { get; set; }

    public TagCategoryDto()
    {
    }

    public TagCategoryDto(TagCategory e)
    {
        Id = e.Id;
        Name = e.Name;
        Description = e.Description;
        Icon = e.Icon;
        IconType = e.IconType;
        ParentCategoryId = e.ParentCategoryId;
    }
}

// Requests/Responses
public class CreateTagCategoryRequest
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? IconType { get; set; }
    public Guid? ParentCategoryId { get; set; }
}

public class UpdateTagCategoryRequest
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? IconType { get; set; }
    public Guid? ParentCategoryId { get; set; }
}

public class TagCategoryResponse
{
    public TagCategoryDto? Category { get; set; }

    public TagCategoryResponse()
    {
    }

    public TagCategoryResponse(TagCategoryDto? cat) => Category = cat;
}

public class ListTagCategoriesResponse
{
    public List<TagCategoryDto> Categories { get; set; } = new();

    public ListTagCategoriesResponse()
    {
    }

    public ListTagCategoriesResponse(List<TagCategoryDto> cats) => Categories = cats;
}

public class DeleteTagCategoryRequest
{
    public Guid Id { get; set; }
}

public class DeleteTagCategoryResponse
{
    public bool Success { get; set; }

    public DeleteTagCategoryResponse()
    {
    }

    public DeleteTagCategoryResponse(bool s) => Success = s;
}

// Operations
[OperationRoute("tag/category/create")]
public sealed class CreateTagCategoryOperation : OperationBase<CreateTagCategoryRequest, TagCategoryResponse>
{
    private readonly IRepository<TagCategory> _repo;
    public CreateTagCategoryOperation(IRepository<TagCategory> repo) => _repo = repo;
    protected override async Task<TagCategoryResponse> HandleAsync(CreateTagCategoryRequest req)
    {
        var e = new TagCategory
        {
            Id = Guid.NewGuid(),
            Name = req.Name,
            Description = req.Description,
            Icon = req.Icon,
            IconType = req.IconType,
            ParentCategoryId = req.ParentCategoryId
        };
        await _repo.AddAsync(e);
        return new TagCategoryResponse(new TagCategoryDto(e));
    }
}

[OperationRoute("tag/category/get")]
public sealed class GetTagCategoryOperation : OperationBase<Guid, TagCategoryResponse>
{
    private readonly IRepository<TagCategory> _repo;
    public GetTagCategoryOperation(IRepository<TagCategory> repo) => _repo = repo;
    protected override async Task<TagCategoryResponse> HandleAsync(Guid id)
    {
        var e = await _repo.FindAsync(x => x.Id == id);
        return new TagCategoryResponse(e is null ? null : new TagCategoryDto(e));
    }
}

[OperationRoute("tag/category/list")]
public sealed class ListTagCategoriesOperation : OperationBase<object, ListTagCategoriesResponse>
{
    private readonly IRepository<TagCategory> _repo;
    public ListTagCategoriesOperation(IRepository<TagCategory> repo) => _repo = repo;
    protected override async Task<ListTagCategoriesResponse> HandleAsync(object _)
    {
        var all = await _repo.GetAllAsync();
        var dtos = all.Select(e => new TagCategoryDto(e)).ToList();
        return new ListTagCategoriesResponse(dtos);
    }
}

[OperationRoute("tag/category/update")]
public sealed class UpdateTagCategoryOperation : OperationBase<UpdateTagCategoryRequest, TagCategoryResponse>
{
    private readonly IRepository<TagCategory> _repo;
    public UpdateTagCategoryOperation(IRepository<TagCategory> repo) => _repo = repo;
    protected override async Task<TagCategoryResponse> HandleAsync(UpdateTagCategoryRequest req)
    {
        var e = await _repo.FindAsync(x => x.Id == req.Id);
        if (e is null)
            return new TagCategoryResponse(null);
        if (req.Name != null)
            e.Name = req.Name;
        if (req.Description != null)
            e.Description = req.Description;
        if (req.Icon != null)
            e.Icon = req.Icon;
        if (req.IconType != null)
            e.IconType = req.IconType;
        if (req.ParentCategoryId.HasValue)
            e.ParentCategoryId = req.ParentCategoryId.Value;
        await _repo.UpdateAsync(x => x.Id == req.Id, e);
        return new TagCategoryResponse(new TagCategoryDto(e));
    }
}

[OperationRoute("tag/category/delete")]
public sealed class DeleteTagCategoryOperation : OperationBase<DeleteTagCategoryRequest, DeleteTagCategoryResponse>
{
    private readonly IRepository<TagCategory> _repo;
    public DeleteTagCategoryOperation(IRepository<TagCategory> repo) => _repo = repo;
    protected override async Task<DeleteTagCategoryResponse> HandleAsync(DeleteTagCategoryRequest req)
    {
        await _repo.DeleteAsync(x => x.Id == req.Id);
        return new DeleteTagCategoryResponse(true);
    }
}