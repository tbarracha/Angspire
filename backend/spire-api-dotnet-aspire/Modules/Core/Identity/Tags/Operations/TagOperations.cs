using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations;
using SpireCore.Repositories;
using App.Core.Identity.Tags.Models;

namespace App.Core.Identity.Tags.Operations;

// DTOs
public class TagDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = default!;
    public string? Icon { get; set; }
    public string? IconType { get; set; }
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? ParentTagId { get; set; }

    public TagDto()
    {
    }

    public TagDto(Tag e)
    {
        Id = e.Id;
        DisplayName = e.DisplayName;
        Icon = e.Icon;
        IconType = e.IconType;
        Description = e.Description;
        CategoryId = e.CategoryId;
        ParentTagId = e.ParentTagId;
    }
}

// Requests/Responses
public class CreateTagRequest
{
    public string DisplayName { get; set; } = default!;
    public string? Icon { get; set; }
    public string? IconType { get; set; }
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? ParentTagId { get; set; }
}

// Requests/Responses
public sealed class ListTagsRequest
{
    /// <summary>Optional. Filter by CategoryId.</summary>
    public Guid? CategoryId { get; set; }
    /// <summary>
    /// Optional. If CategoryId is null, resolves category by Name (case-insensitive).
    /// </summary>
    public string? CategoryName { get; set; }
    /// <summary>Optional. Filter by ParentTagId.</summary>
    public Guid? ParentTagId { get; set; }
    /// <summary>Optional. "displayName" (default).</summary>
    public string? SortBy { get; set; }
    /// <summary>Optional. "asc" (default) or "desc".</summary>
    public string? SortDir { get; set; }
}

public class UpdateTagRequest
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? IconType { get; set; }
    public string? Description { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? ParentTagId { get; set; }
}

public class TagResponse
{
    public TagDto? Tag { get; set; }

    public TagResponse()
    {
    }

    public TagResponse(TagDto? tag) => Tag = tag;
}

public class ListTagsResponse
{
    public List<TagDto> Tags { get; set; } = new();

    public ListTagsResponse()
    {
    }

    public ListTagsResponse(List<TagDto> tags) => Tags = tags;
}

public class DeleteTagRequest
{
    public Guid Id { get; set; }
}

public class DeleteTagResponse
{
    public bool Success { get; set; }

    public DeleteTagResponse()
    {
    }

    public DeleteTagResponse(bool s) => Success = s;
}

// Operations
[OperationRoute("tag/create")]
public sealed class CreateTagOperation : OperationBase<CreateTagRequest, TagResponse>
{
    private readonly IRepository<Tag> _repo;
    public CreateTagOperation(IRepository<Tag> repo) => _repo = repo;
    protected override async Task<TagResponse> HandleAsync(CreateTagRequest req)
    {
        var e = new Tag
        {
            Id = Guid.NewGuid(),
            DisplayName = req.DisplayName,
            Icon = req.Icon,
            IconType = req.IconType,
            Description = req.Description,
            CategoryId = req.CategoryId,
            ParentTagId = req.ParentTagId
        };
        await _repo.AddAsync(e);
        return new TagResponse(new TagDto(e));
    }
}

[OperationRoute("tag/get")]
public sealed class GetTagOperation : OperationBase<Guid, TagResponse>
{
    private readonly IRepository<Tag> _repo;
    public GetTagOperation(IRepository<Tag> repo) => _repo = repo;
    protected override async Task<TagResponse> HandleAsync(Guid id)
    {
        var e = await _repo.FindAsync(x => x.Id == id);
        return new TagResponse(e is null ? null : new TagDto(e));
    }
}

[OperationRoute("tag/list")]
public sealed class ListTagsOperation : OperationBase<ListTagsRequest, ListTagsResponse>
{
    private readonly IRepository<Tag> _tagRepo;
    private readonly IRepository<TagCategory> _categoryRepo;
    public ListTagsOperation(IRepository<Tag> tagRepo, IRepository<TagCategory> categoryRepo)
    {
        _tagRepo = tagRepo;
        _categoryRepo = categoryRepo;
    }

    protected override async Task<ListTagsResponse> HandleAsync(ListTagsRequest req)
    {
        // Resolve CategoryId from CategoryName if needed
        Guid? resolvedCategoryId = req.CategoryId;
        if (!resolvedCategoryId.HasValue && !string.IsNullOrWhiteSpace(req.CategoryName))
        {
            var name = req.CategoryName.Trim();
            // TagCategory has Name (not DisplayName)
            var category = await _categoryRepo.FindAsync(c => c.Name != null && c.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (category is not null)
                resolvedCategoryId = category.Id;
            else
                return new ListTagsResponse(new()); // no category with that name -> empty list
        }

        // Fetch and filter (switch to repo-level predicates if your IRepository supports them)
        var all = await _tagRepo.GetAllAsync();
        IEnumerable<Tag> filtered = all;
        if (resolvedCategoryId.HasValue)
            filtered = filtered.Where(t => t.CategoryId == resolvedCategoryId.Value);
        if (req.ParentTagId.HasValue)
            filtered = filtered.Where(t => t.ParentTagId == req.ParentTagId.Value);
        // Sorting - safe fields only
        var sortBy = (req.SortBy ?? "displayName").Trim().ToLowerInvariant();
        var sortDir = (req.SortDir ?? "asc").Trim().ToLowerInvariant();
        filtered = sortBy switch
        {
            "displayname" or "name" => sortDir == "desc" ? filtered.OrderByDescending(t => t.DisplayName) : filtered.OrderBy(t => t.DisplayName),
            _ => sortDir == "desc" ? filtered.OrderByDescending(t => t.DisplayName) : filtered.OrderBy(t => t.DisplayName)
        };
        // Map
        var dtos = filtered.Select(t => new TagDto(t)).ToList();
        return new ListTagsResponse(dtos);
    }
}

[OperationRoute("tag/update")]
public sealed class UpdateTagOperation : OperationBase<UpdateTagRequest, TagResponse>
{
    private readonly IRepository<Tag> _repo;
    public UpdateTagOperation(IRepository<Tag> repo) => _repo = repo;
    protected override async Task<TagResponse> HandleAsync(UpdateTagRequest req)
    {
        var e = await _repo.FindAsync(x => x.Id == req.Id);
        if (e is null)
            return new TagResponse(null);
        if (req.DisplayName != null)
            e.DisplayName = req.DisplayName;
        if (req.Icon != null)
            e.Icon = req.Icon;
        if (req.IconType != null)
            e.IconType = req.IconType;
        if (req.Description != null)
            e.Description = req.Description;
        if (req.CategoryId.HasValue)
            e.CategoryId = req.CategoryId.Value;
        if (req.ParentTagId.HasValue)
            e.ParentTagId = req.ParentTagId.Value;
        await _repo.UpdateAsync(x => x.Id == req.Id, e);
        return new TagResponse(new TagDto(e));
    }
}

[OperationRoute("tag/delete")]
public sealed class DeleteTagOperation : OperationBase<DeleteTagRequest, DeleteTagResponse>
{
    private readonly IRepository<Tag> _repo;
    public DeleteTagOperation(IRepository<Tag> repo) => _repo = repo;
    protected override async Task<DeleteTagResponse> HandleAsync(DeleteTagRequest req)
    {
        await _repo.DeleteAsync(x => x.Id == req.Id);
        return new DeleteTagResponse(true);
    }
}