### Generate CRUD Operations for a Domain Model

**(Consistent Namespace, Attribute Grouping, Always ListPaged, All Usings, OperationGroup, and OperationRoute with Plural Route Names)**

You are a code generation assistant for .NET backend APIs.
Given a domain model (a C# class), **generate the base CRUD operation class AND the full set of operation classes** for that entity, following these rules:

---

#### **Requirements**

* **All files use the SAME namespace:**

  * Pattern:
    `Genspire.Application.Modules.Iam.Operations.{PluralName}.{EntityName}Operations`
  * Example for `GroupMember`:
    `namespace Genspire.Application.Modules.Iam.Operations.Groups.GroupMemberOperations;`
  * **Every generated file (including DTOs)** starts with this namespace (not just the base class).

* **Always include these using statements** at the top of every file:

  * `using Genspire.Application.Modules.Iam.Domain.Models.{PluralName};`
  * `using Genspire.Application.Modules.Iam.Infrastructure;`
  * `using SpireCore.API.Operations.Attributes;`
  * `using SpireCore.API.Operations.Dtos;`

* **Generate a single abstract `Base{EntityName}CrudOperation<TRequest, TResponse>` class:**

  * Inherits from:
    `BaseIamEntityCrudeOperation<{EntityName}, AuditableRequestDto<TRequest>, TResponse>`
  * Receives the repository in the constructor.
  * Does **NOT** have `OperationGroup` or `OperationRoute` attributes.
  * In same namespace and with all required usings.

* **Each operation (GetById, Create, Update, Delete, and always ListPaged) is its own class/file.**

  * At the top: required DTO(s) for that operation.
  * **Above every operation class (not DTOs, not base):**

    * `[OperationGroup("{Normalized Domain Model Name}")]`
    * `[OperationRoute("{entity-kebab-plural}/{action}")]`

      * The operation route must be a lowercase, kebab-case, REST-style string, using the **plural** kebab-case name of the domain model (e.g., `"group-members/page"`, `"group-types/get"`).
      * Pattern: `{entity-kebab-plural}/{action}` where:

        * `{entity-kebab-plural}` is the plural, kebab-case name of the domain model (e.g. `group-members`, `group-types`).
        * `{action}` is `list`, `get`, `create`, `update`, `delete` as appropriate for the operation.
  * *Normalized Domain Model Name* means a user-friendly version (e.g., `"Group Member"` for `GroupMember`, `"Group Type"` for `GroupType`).

* All operations inherit from `Base{EntityName}CrudOperation<TRequestDto, TResponse>`.

* Use **`AuditableRequestDto<TRequestDto>`** as the parameter for `ExecuteAsync`.

* The repository is always assumed to be `BaseIamEntityRepository<{EntityName}>`.

* All methods must be **async** and use `_repository` for all data access.

* **You must always include a ListPaged operation:**

  * The DTO is named `List{PluralName}PagedDto` and includes `Page`, `PageSize`, and relevant filters.
  * The operation is named `List{PluralName}PagedOperation`.
  * The operation returns `PaginatedResult<{EntityName}>`.
  * Uses `_repository.Query()` for filtering and paging.
  * Operation class has both `[OperationGroup("...")]` and `[OperationRoute("...")]` attributes, and namespace/usings.

---

#### **Example Output Format**

**(For domain model `GroupMember`)**

```csharp
// --------- BaseGroupMemberCrudOperation.cs -----------
using Genspire.Application.Modules.Iam.Domain.Models.Groups;
using Genspire.Application.Modules.Iam.Infrastructure;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Dtos;

namespace Genspire.Application.Modules.Iam.Operations.Groups.GroupMemberOperations;

/// <summary>
/// Abstract base class for all Group Member CRUD operations.
/// </summary>
public abstract class BaseGroupMemberCrudOperation<TRequest, TResponse>
    : BaseIamEntityCrudeOperation<GroupMember, AuditableRequestDto<TRequest>, TResponse>
{
    protected BaseGroupMemberCrudOperation(BaseIamEntityRepository<GroupMember> entityRepository)
        : base(entityRepository)
    { }
}
```

```csharp
// --------- ListGroupMembersPagedOperation.cs -----------
using Genspire.Application.Modules.Iam.Domain.Models.Groups;
using Genspire.Application.Modules.Iam.Infrastructure;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Dtos;

namespace Genspire.Application.Modules.Iam.Operations.Groups.GroupMemberOperations;

public class ListGroupMembersPagedDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public Guid? GroupId { get; set; }
    public Guid? UserId { get; set; }
    // Add other filters as needed
}

[OperationGroup("IAM Group Members")]
[OperationRoute("group-members/page")]
public class ListGroupMembersPagedOperation : BaseGroupMemberCrudOperation<ListGroupMembersPagedDto, PaginatedResult<GroupMember>>
{
    public ListGroupMembersPagedOperation(BaseIamEntityRepository<GroupMember> repository) : base(repository) { }

    public override async Task<PaginatedResult<GroupMember>> ExecuteAsync(AuditableRequestDto<ListGroupMembersPagedDto> request)
    {
        var filter = request.data;
        var query = _repository.Query();

        if (filter.GroupId.HasValue)
            query = query.Where(gm => gm.GroupId == filter.GroupId.Value);
        if (filter.UserId.HasValue)
            query = query.Where(gm => gm.UserId == filter.UserId.Value);

        var totalCount = await query.CountAsync();
        var items = await query.Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync();
        return new PaginatedResult<GroupMember>(items, totalCount, filter.Page, filter.PageSize);
    }
}
```

*(Repeat for GetById, Create, Update, Delete — always with both attributes and **pluralized** kebab-case operation routes, e.g.: `group-members/get`, `group-members/create`, `group-members/update`, `group-members/delete`.)*

---

### **Prompt Instruction**

**Given the following domain model, generate:**

* The abstract `Base{EntityName}CrudOperation<TRequest, TResponse>` class, with all required usings and correct namespace.
* The full set of CRUD operation classes:

  * Each with required DTO(s) at the top.
  * Each with all required usings and the exact same namespace.
  * **Each operation class (not DTOs, not base) has both:**

    * `[OperationGroup("{Normalized Domain Model Name}")]`
    * `[OperationRoute("{entity-kebab-plural}/{action}")]`

      * **Always use the plural kebab-case model name in the route.**
* **You must always generate a ListPaged operation** (`List{PluralName}PagedOperation`) with its DTO and proper repository-based implementation, as shown above.
* All naming, attributes, and structure must match the example above.

**Model:**

// Paste your domain model here.

