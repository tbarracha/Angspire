# Refactor Operations to Use Context-Based Architecture for a Custom Domain Model

**Objective:**
Refactor all of the following operations to use the provided base classes and a context-based dependency pattern.
You will paste your actual domain model code at the end of this prompt; all `[placeholders]` and example identifiers below should be adapted to your chosen domain model.

---

## Requirements

1. **Base Class**
   All operations must inherit from the following base operation class, using the domain-specific context as the main entry point for repositories and services:

```csharp
using Genspire.Application.Modules.Iam.Domain.Contexts;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Dtos;
using SpireCore.Services;

namespace Genspire.Application.Modules.Iam.Operations.Groups;

/// <summary>
/// Base class for operations related to Group domain logic.
/// Provides access to Group repositories and services through GroupContext.
/// </summary>
public abstract class BaseGroupDomainOperation<TRequest, TResponse> : IOperation<AuditableRequestDto<TRequest>, TResponse>, ITransientService
{
    protected readonly GroupContext _groupContext;

    protected BaseGroupDomainOperation(GroupContext groupContext)
    {
        _groupContext = groupContext;
    }

    public abstract Task<TResponse> ExecuteAsync(AuditableRequestDto<TRequest> request);
}
```

2. **Dependency Context Pattern**

   * All dependencies (repositories, services, etc.) must be accessed through the provided `GroupContext` and its `RepositoryContext` property.
   * **Do not inject repositories or services directly** into the operations—only inject `GroupContext`.
   * Refactor all internal usages to reference dependencies through the context.

```csharp
using Genspire.Application.Modules.Iam.Domain.Services;
using SpireCore.Services;

namespace Genspire.Application.Modules.Iam.Domain.Contexts;

public class GroupContext : ITransientService
{
    public GroupRepositoryContext RepositoryContext { get; }

    public GroupService GroupService { get; }

    public GroupContext(
        GroupRepositoryContext repositoryContext,
        GroupService groupService)
    {
        RepositoryContext = repositoryContext;
        GroupService = groupService;
    }
}
```

```csharp
using Genspire.Application.Modules.Iam.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Iam.Domain.Contexts;

public class GroupRepositoryContext : ITransientService
{
    public GroupRepository GroupRepository { get; }
    public GroupTypeRepository GroupTypeRepository { get; }
    public GroupMemberRepository GroupMemberRepository { get; }
    public GroupMembershipStateRepository GroupMembershipStateRepository { get; }
    public GroupMemberAuditRepository GroupMemberAuditRepository { get; }

    public GroupRepositoryContext(
        GroupRepository groupRepository,
        GroupTypeRepository groupTypeRepository,
        GroupMemberRepository groupMemberRepository,
        GroupMembershipStateRepository groupMembershipStateRepository,
        GroupMemberAuditRepository groupMemberAuditRepository)
    {
        GroupRepository = groupRepository;
        GroupTypeRepository = groupTypeRepository;
        GroupMemberRepository = groupMemberRepository;
        GroupMembershipStateRepository = groupMembershipStateRepository;
        GroupMemberAuditRepository = groupMemberAuditRepository;
    }
}
```

3. **Constructor Pattern**
   Each operation’s constructor must accept only the context (e.g., `GroupContext`—to be renamed according to your domain model) and assign it to a protected field.

4. **Internal Usages**
   Refactor all code within each operation to access dependencies via the context, not direct references or fields.

5. **Domain Model Adaptation**
   All classes, context names, repository properties, and usages of `Group` in these examples should be **adapted to your own domain model** (e.g., `User`, `Project`, `Order`, etc.).

---

## Operations to Refactor

Paste your operations here (in their current form, with any existing DI style).
All usages of old dependency injection and direct repository/service usage should be updated to follow the context pattern above, using names and structure appropriate for your domain model.


---

## Output

For each operation:

* Refactor it to use the context-based dependency pattern as described above.
* Ensure all repository and service usages are accessed through the context.
* Update constructors and all references accordingly.
* Adapt all identifiers and context names to your specific domain model.

If you see opportunities for architectural improvements or best practices, briefly note them after the refactored code.

---

## Domain Model


