# SpireKit

> **“Prove you need complexity before you pay for it.”**
> *Build a robust monolith, split only when you’ve proven the need.*

**SpireKit** is a .NET backend foundation designed for sustainable scale. You get modular building blocks, a clean domain-first API model, and the freedom to stay monolithic until microservices are truly justified.

---

## 🏛️ Sections Overview

* **SpireCore:**
  Pure contracts, interfaces, events, and shared utilities.
* **Genspire:**
  DDD-inspired architecture—atomic Operations, endpoint auto-mapping, EF infrastructure, JWT, Swagger, DTO-to-TypeScript.
* **SpireCLI:**
  Composable, command-based CLI for all backend/admin tooling.

---

## 🧱 SpireCore

**Purpose:**
The shared backbone for all SpireKit modules.

**What you’ll find:**

* **Abstractions:**
  `ICreatedAt`, `IStateFlag`, `IHasId`, etc.

* **Events:**
  In-memory domain event dispatcher (`EventEmitter`, `IEventDispatcher`).

* **Utilities:**
  Guid helpers, constants, pagination contracts.

* **Automatic DI Registration:**
  SpireCore enables automatic dependency injection by using marker interfaces:

  ```csharp
  namespace SpireCore.Services;

  public interface ITransientService { }
  public interface IScopedService { }
  public interface ISingletonService { }
  ```

  Any service, repository, or class implementing one of these interfaces will be automatically discovered and registered with the appropriate lifetime when you call:

  ```csharp
  builder.Services.AddApplicationServices();
  ```

  This includes:

  * Concrete service classes
  * Implemented interfaces
  * Generic or base class bindings (like abstract repository base types)

  **Examples:**

  * A repository class implementing `ITransientService` gets registered as both `MyRepository` and its interfaces, with transient lifetime.
  * A service implementing `IScopedService` gets injected per request, automatically.

**What you won’t find:**
No entities, repositories, or DB logic.
*All other SpireKit modules depend on SpireCore.*

---

## 📦 Genspire

### Project Folder Structure

Genspire is made up of several projects for clear separation of concerns:

* **Spire.Api.Application** — Domain, modules, and application logic
* **Spire.Api.Contracts** — DTOs and Event contracts shared across layers
* **Spire.Api.Host** — The API host/startup project
* **Spire.Api.Infrastructure** — Infrastructure, persistence, and EF Core
* **Spire.Api.Shared** — Shared utilities, cross-cutting concerns

A PowerShell `Export-TemplateFromGenspire.ps1` script is provided to copy the current project into a `/Templates` folder, update namespaces, and optionally remove modules (all modules are included by default).

---

### 🧩 Modules & Vertical Structure

**Genspire** is organized into clear, self-contained **modules**.
Each module represents a distinct business subdomain and contains everything it needs: domain models, services, operations (endpoints), infrastructure, and DTOs.

**This “vertical slice” design means:**

* Features and modules are *loosely coupled* and highly cohesive.
* Each module can be developed, tested, and reasoned about independently.
* When your project grows, modules can be split off into standalone microservices—**with minimal rewrite**.

---

#### **Module Anatomy**

Example: `Modules/Iam`
A typical module contains:

```
Modules/
└-- Iam/
    ├-- Domain/
    │   ├-- Models/           # Business objects/entities
    │   ├-- Services/         # Core domain logic
    ├-- Dtos/                 # Module-specific Data Transfer Objects
    ├-- Infrastructure/       # Persistence, DbContext, repository implementations
    └-- Operations/           # All API endpoints for this module, organized by feature
```

**Common structure in every module:**

| Folder            | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `Domain/Models`   | Core entities and value objects for the module          |
| `Domain/Services` | Domain/application services (business logic, not infra) |
| `Dtos`            | Input/output types for API and internal logic           |
| `Infrastructure`  | Persistence (DbContext, repositories, migrations, etc)  |
| `Operations`      | All endpoint classes (atomic, auto-mapped Operations)   |

> **Vertical Slices:**
> Each module’s `Operations` folder exposes its API endpoints, written as `IOperation` classes.
> Domain, services, and infrastructure are kept together—no hidden cross-module dependencies.

---

#### **Ready for Microservices**

* **Modules are self-contained:** All logic, endpoints, and storage are within the module boundary.
* **Move to microservices:** When you outgrow the monolith, a module can be “lifted out” and run as a separate API/microservice.
  Only integration wiring needs updating.
* **Start simple, split only when needed:** Don’t over-complicate until there’s real scale or team pressure.

---

**This modular, vertical architecture makes SpireKit perfect for modern DDD:**

* Every business capability is “plug and play.”
* Boundaries are explicit and enforceable.
* Migration to microservices, if/when needed, is straightforward.

---

### 🌐 Domain-Driven Operations (API Endpoints)

**Atomic Operations = HTTP Endpoints**

* Write Operations as classes (not controller actions) implementing `IOperation<TRequest, TResponse>`.
* Each Operation is a vertical, single-responsibility slice of domain logic—testable, composable, and explicit.
* Think “actions” or “use cases,” not “REST resource plumbing.”

**Automatic Endpoint Mapping**

* All Operations are discovered and registered as HTTP endpoints at startup.
* No controller or route boilerplate.
* Route, HTTP verb, grouping, permissions, and output types are controlled by attributes.

---

#### **Comprehensive Operation Example**

```csharp
using Genspire.Contracts.Dtos.Features.Hello;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;

namespace Genspire.Application.Features.Hello.Operations;

// Group for Swagger/docs and logical organization
[OperationGroup("Hello")]   

// Route will be POST /api/hello/world
[OperationRoute("hello/world")]
[OperationMethod(OperationMethodType.POST)]

// Optionally require authorization
[OperationAuthorize("UserPolicy")]

// Optionally specify file output type
// [OperationProducesFile(OperationFileContentType.Json)]
public class HelloWorldOperation : IOperation<HelloRequestDto, HelloResponseDto>
{
    public Task<HelloResponseDto> ExecuteAsync(HelloRequestDto request)
    {
        // Domain logic is self-contained, atomic, and testable
        return Task.FromResult(new HelloResponseDto
        {
            Message = $"Hello, {request.Name} {request.LastName}!"
        });
    }
}
```

* **No controllers required.** The system auto-wires this Operation as an HTTP POST endpoint.
* **Attributes drive everything:**

  * `OperationRoute`: The HTTP route (relative to /api/).
  * `OperationMethod`: HTTP verb (GET, POST, etc.).
  * `OperationAuthorize`: Policy-based auth.
  * `OperationGroup`: Logical grouping for docs and navigation.
  * `OperationProducesFile`: Specify file/content output (optional).

---

**Why this matters:**

* All business logic lives in a domain-focused, atomic class—*not* scattered across service and controller layers.
* Endpoints are minimal, explicit, and easily tested in isolation.
* Rich metadata and permissions are declarative, not hidden in code.
* **True DDD:** Your application’s API surface becomes a direct reflection of your business use cases.

---

**Sample DTO for above Operation:**

```csharp
// Request DTO
public class HelloRequestDto
{
    public string Name { get; set; }
    public string LastName { get; set; }
}

// Response DTO
public class HelloResponseDto
{
    public string Message { get; set; }
}
```

**Auto-generates to TypeScript:**

```ts
export interface HelloRequestDto {
  name: string;
  lastName: string;
}
export interface HelloResponseDto {
  message: string;
}
```

> **You focus on your domain and atomic operations.
> SpireKit handles the HTTP surface, wiring, and docs.**

---

## 🖥 SpireCLI

**Purpose:**
A modular command pattern for all CLI/admin/devops tooling.

**Features:**

* Command/Result system (`ICommand`, `CommandManager`)
* Contextual, navigable menus
* Easily extensible for your automation workflows

**Example:**

```csharp
public class HelloCommand : ICommand
{
    public string Name => "hello";
    public async Task<CommandResult> ExecuteAsync(CommandContext ctx)
    {
        Console.WriteLine("Hello, world!");
        return CommandResult.Success();
    }
}
```

---

## 🚀 Usage

Until NuGet is ready, reference directly:

```bash
dotnet add reference ../SpireKit/SpireCore.csproj
```

(Adjust path as needed.)

---

## 📝 The SpireKit Philosophy

* **Start monolithic, split out only when the pain is real.**
* **Domain logic is king: Write your business logic once, close to the domain.**
* **Atomic, testable, and self-documenting endpoints via Operations.**
* **Zero magic, maximum extensibility and clarity.**
* **Complexity only when it pays for itself.**

---

## 🧩 Roadmap

* NuGet support
* Real-world DDD and migration samples
* Recipes for moving from monolith to microservices

---

**Build simple. Refactor when you must. Put the domain first.**
— The SpireKit Philosophy

