// File: ExportGenspireOperationContractsCommand.cs
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;
using SpireCore.Commands;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Genspire.CLI.Commands.Genspire;

public sealed class ExportGenspireOperationContractsCommand : BaseCommand
{
    public override string Name => "export-operation-contracts";

    public override CommandResult Execute(CommandContext context)
    {
        var args = context.Args ?? Array.Empty<string>();

        var defaultDir = @"C:\Exports\Genspire\Operation Contracts";
        var dir = GetArg(args, "--dir") ?? defaultDir;
        var fileName = GetArg(args, "--out") ?? "ops.contracts.json";
        var rootNs = GetArg(args, "--root") ?? "Genspire.Application";
        var apiBase = TrimTrailingSlash(GetArg(args, "--apiBase") ?? "/");

        Directory.CreateDirectory(dir);
        var outPath = Path.IsPathRooted(fileName) ? fileName : Path.Combine(dir, fileName);
        var tsStamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        var stampedOutPath = Path.Combine(dir, $"ops.contracts.{tsStamp}.json");

        var assemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && a.GetName().Name is not null &&
                        (a.GetName().Name!.StartsWith("Genspire.", StringComparison.OrdinalIgnoreCase) ||
                         a.GetName().Name!.StartsWith("SpireCore.", StringComparison.OrdinalIgnoreCase) ||
                         a.GetName().Name!.StartsWith("Iam.", StringComparison.OrdinalIgnoreCase) ||
                         a.GetName().Name!.StartsWith(rootNs, StringComparison.OrdinalIgnoreCase)))
            .Distinct()
            .ToArray();

        var model = new ContractsExportModel();
        var visitor = new TypeGraphVisitor(model);

        // ----- Gather Operations & DTOs via reflection -----
        foreach (var asm in assemblies)
        {
            foreach (var t in SafeGetTypes(asm))
            {
                if (!t.IsClass || t.IsAbstract) continue;
                var opIface = GetOperationInterface(t);
                if (opIface is null) continue;

                var argsGen = opIface.GetGenericArguments();
                var reqType = argsGen[0];
                var resType = argsGen[1];

                var route = t.GetCustomAttribute<OperationRouteAttribute>()?.Route ?? InferRouteFromName(t);
                var authorize = t.GetCustomAttribute<OperationAuthorizeAttribute>() != null;
                var isStream = typeof(IStreamableOperation<,>).IsAssignableFromGeneric(t);

                var (module, aggregate) = ParseModuleAndAggregate(t);
                var (isCrud, crudKind) = ClassifyCrud(t.Name);

                model.Operations.Add(new OperationInfo
                {
                    OperationClass = t.FullName!,
                    Route = route,
                    Authorized = authorize,
                    IsStream = isStream,
                    Request = TypeRef.From(reqType),
                    Response = TypeRef.From(resType),
                    Module = module,
                    Aggregate = aggregate,
                    IsCrud = isCrud,
                    CrudKind = crudKind
                });

                // Walk graphs (collects all DTOs, including those declared in same file)
                visitor.VisitType(reqType);
                visitor.VisitType(resType);
            }
        }

        // ----- Build Modules view (group + sort) -----
        model.Modules = model.Operations
            .GroupBy(o => o.Module ?? "_")
            .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
            .Select(g => new ModuleExport
            {
                Name = g.Key,
                Operations = g
                    .OrderByDescending(o => o.IsCrud)                       // CRUD first
                    .ThenBy(o => CrudOrderKey(o.CrudKind))                  // Create, Read(Get), List, Update, Delete
                    .ThenBy(o => o.OperationClass, StringComparer.OrdinalIgnoreCase)
                    .ToList()
            })
            .ToList();

        // ---------------------------------------------------------------------------------
        // RAW CODE: C# (DTOs then Operations)  — source discovery from repo root heuristics
        // ---------------------------------------------------------------------------------
        var repoRoot = FindRepositoryRoot() ?? Directory.GetCurrentDirectory();
        var allTypes = assemblies.SelectMany(SafeGetTypes).ToArray();

        // C# DTOs
        foreach (var dto in model.Dtos.OrderBy(d => d.Name, StringComparer.OrdinalIgnoreCase))
        {
            var dtoType = allTypes.FirstOrDefault(t =>
                string.Equals(t.Namespace, dto.Namespace, StringComparison.Ordinal) &&
                string.Equals(StripGenericArity(t.Name), StripGenericArity(dto.Name), StringComparison.Ordinal));
            var code = dtoType != null ? FindSourceCodeForType(dtoType, repoRoot) : null;
            if (!string.IsNullOrWhiteSpace(code))
                model.RawCode.CSharp.Dtos.Add(code!);
        }
        // C# Operations
        foreach (var op in model.Operations.OrderBy(o => o.OperationClass, StringComparer.OrdinalIgnoreCase))
        {
            var opType = allTypes.FirstOrDefault(t => string.Equals(t.FullName, op.OperationClass, StringComparison.Ordinal));
            var code = opType != null ? FindSourceCodeForType(opType, repoRoot) : null;
            if (!string.IsNullOrWhiteSpace(code))
                model.RawCode.CSharp.Operations.Add(code!);
        }

        // ---------------------------------------------------------------------------------
        // RAW CODE: TypeScript — per-module DTOs and an Angular 19 service calling endpoints
        // ---------------------------------------------------------------------------------
        // Build a map of DTO -> TS name (handles generics)
        var tsNameMap = model.Dtos.ToDictionary(
            d => (d.Namespace ?? "") + "|" + d.Name,
            d => SanitizeTsName(d.Name),
            StringComparer.Ordinal);

        // For quick lookup by (ns|name) from PropertySchema types (by TypeName + Namespace)
        string KeyFor(string? ns, string name) => (ns ?? "") + "|" + name;

        // Helper: Does this module reference a DTO (directly/indirectly) through its ops?
        // For simplicity and speed, we approximate: include DTOs in the same module namespace
        // AND any DTOs whose sanitized name appears in request/response graphs via names.
        var moduleToDtos = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var mod in model.Modules)
        {
            var set = new HashSet<string>(StringComparer.Ordinal);
            // Include DTOs whose namespace points to this module
            foreach (var dto in model.Dtos)
            {
                var m = ParseModuleFromNamespace(dto.Namespace);
                if (string.Equals(m, mod.Name, StringComparison.OrdinalIgnoreCase))
                    set.Add(KeyFor(dto.Namespace, dto.Name));
            }

            // Include DTOs referenced by this module's operations (request/response graph roots)
            foreach (var op in mod.Operations)
            {
                // Add request/response types by (ns|name)
                set.Add(KeyFor(op.Request.Namespace, op.Request.Name));
                set.Add(KeyFor(op.Response.Namespace, op.Response.Name));
            }

            moduleToDtos[mod.Name] = set;
        }

        // Generate DTO TS code per module
        foreach (var mod in model.Modules)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"/**");
            sb.AppendLine($" * Auto-generated DTOs for module: {mod.Name}");
            sb.AppendLine($" * Generated at: {DateTime.Now:O}");
            sb.AppendLine($" */");
            sb.AppendLine();

            // Stable order: alpha by sanitized TS name
            var dtosForModule = model.Dtos
                .Where(d =>
                {
                    var key = KeyFor(d.Namespace, d.Name);
                    if (moduleToDtos.TryGetValue(mod.Name, out var set) && set.Contains(key))
                        return true;

                    // Heuristic: include shared core DTOs referenced everywhere (SpireCore.* etc.)
                    var ns = d.Namespace ?? "";
                    if (ns.StartsWith("SpireCore.", StringComparison.OrdinalIgnoreCase)) return true;
                    return false;
                })
                .OrderBy(d => SanitizeTsName(d.Name), StringComparer.OrdinalIgnoreCase)
                .ToList();

            var emitted = new HashSet<string>(StringComparer.Ordinal);
            foreach (var dto in dtosForModule)
            {
                var tsName = tsNameMap[KeyFor(dto.Namespace, dto.Name)];
                if (emitted.Contains(tsName)) continue;

                sb.AppendLine(EmitTsForDto(dto, tsName, tsNameMap));
                sb.AppendLine();
                emitted.Add(tsName);
            }

            if (emitted.Count > 0)
                model.RawCode.TypeScript.Dtos.Add($"// Module: {mod.Name}\n\n" + sb.ToString());
        }

        // Generate Angular 19 service per module
        foreach (var mod in model.Modules)
        {
            if (mod.Operations.Count == 0) continue;

            var sb = new StringBuilder();
            sb.AppendLine($"/**");
            sb.AppendLine($" * Auto-generated Angular 19 service for module: {mod.Name}");
            sb.AppendLine($" * Generated at: {DateTime.Now:O}");
            sb.AppendLine($" */");
            sb.AppendLine("import { Injectable, inject } from '@angular/core';");
            sb.AppendLine("import { HttpClient } from '@angular/common/http';");
            sb.AppendLine("import { Observable } from 'rxjs';");
            sb.AppendLine();

            // Re-declare minimal TS types inline? Prefer importing from DTO block.
            // Since we’re emitting raw code strings, we assume colocated files; leave import comment:
            sb.AppendLine("// TODO: import DTOs from the DTO file emitted for this module if split into files");
            sb.AppendLine("// import { CreateSessionRequest, SessionResponse, ... } from './<module>.dtos';");
            sb.AppendLine();

            var svcName = $"{SanitizeTsName(mod.Name)}OperationsService";
            sb.AppendLine("@Injectable({ providedIn: 'root' })");
            sb.AppendLine($"export class {svcName} {{");
            sb.AppendLine($"  private readonly http = inject(HttpClient);");
            sb.AppendLine($"  private readonly baseUrl = '{apiBase}';");
            sb.AppendLine();

            foreach (var op in mod.Operations)
            {
                var methodName = ToCamel(RemoveSuffix(GetLeaf(op.OperationClass), "Operation"));
                var reqTs = TsTypeFromTypeRef(op.Request, tsNameMap);
                var resTs = TsTypeFromTypeRef(op.Response, tsNameMap);
                var route = op.Route?.TrimStart('/') ?? "";

                // Default to POST; if you have verb metadata, switch accordingly.
                sb.AppendLine($"  {methodName}(request: {reqTs}): Observable<{resTs}> {{");
                sb.AppendLine($"    const url = `${{this.baseUrl}}/{route}`;");
                sb.AppendLine($"    return this.http.post<{resTs}>(url, request);");
                sb.AppendLine("  }");
                sb.AppendLine();
            }

            sb.AppendLine("}");
            model.RawCode.TypeScript.Operations.Add($"// Module: {mod.Name}\n\n" + sb.ToString());
        }

        // ----- Serialize & write files -----
        var json = JsonSerializer.Serialize(model, new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        File.WriteAllText(outPath, json);
        File.WriteAllText(stampedOutPath, json);

        Console.WriteLine($"[export-operation-contracts]");
        Console.WriteLine($"  Repo Root          : {repoRoot}");
        Console.WriteLine($"  Modules            : {model.Modules.Count}");
        Console.WriteLine($"  Operations (total) : {model.Operations.Count}");
        Console.WriteLine($"  DTOs               : {model.Dtos.Count}");
        Console.WriteLine($"  RawCode C#         : DTOs={model.RawCode.CSharp.Dtos.Count}, Ops={model.RawCode.CSharp.Operations.Count}");
        Console.WriteLine($"  RawCode TS         : DTO blocks={model.RawCode.TypeScript.Dtos.Count}, Service blocks={model.RawCode.TypeScript.Operations.Count}");
        Console.WriteLine($"  Output             : {outPath}");
        Console.WriteLine($"  Snapshot           : {stampedOutPath}");
        return CommandResult.Success();
    }

    // ----------------- TypeScript emit helpers -----------------

    private static string EmitTsForDto(DtoSchema dto, string tsName, Dictionary<string, string> tsNameMap)
    {
        if (dto.IsEnum)
        {
            var enumValues = (dto.EnumNames ?? new List<string>()).Select(n => $"  {n} = '{n}'");
            return $"export enum {tsName} {{\n{string.Join(",\n", enumValues)}\n}}";
        }

        var sb = new StringBuilder();
        sb.AppendLine($"export interface {tsName} {{");
        foreach (var p in dto.Properties ?? new List<PropertySchema>())
        {
            var tsType = TsTypeFromProperty(p, tsNameMap);
            var optional = p.Nullable ? "?" : "";
            sb.AppendLine($"  {ToCamel(p.Name)}{optional}: {tsType};");
        }
        sb.Append("}");
        return sb.ToString();
    }

    private static string TsTypeFromProperty(PropertySchema p, Dictionary<string, string> tsNameMap)
    {
        // Collections
        if (p.IsCollection && p.ElementType is not null)
        {
            var elem = TsTypeFromTypeRef(p.ElementType, tsNameMap);
            return $"{elem}[]";
        }

        // Primitive-ish
        var mapped = MapClrToTs(p.TypeName);
        if (mapped != null) return mapped;

        // Generic like PaginatedResult<SessionDto> -> PaginatedResult_SessionDto
        if (p.GenericArguments is { Count: > 0 })
        {
            var inner = string.Join("_", p.GenericArguments.Select(ga => TsTypeFromTypeRef(ga, tsNameMap)));
            return SanitizeTsName($"{StripGenericArity(p.TypeName)}<{inner}>");
        }

        // Complex: try to map by (ns|name)
        var key = (p.Namespace ?? "") + "|" + StripGenericArity(p.TypeName);
        if (tsNameMap.TryGetValue(key, out var ts))
            return ts;

        // Fallback
        return "any";
    }

    private static string TsTypeFromTypeRef(TypeRef tr, Dictionary<string, string> tsNameMap)
    {
        if (tr.IsCollection && tr.ElementType != null)
        {
            var e = TsTypeFromTypeRef(tr.ElementType, tsNameMap);
            return $"{e}[]";
        }

        // Try primitives first
        var mapped = MapClrToTs(tr.Name);
        if (mapped != null) return mapped;

        var key = (tr.Namespace ?? "") + "|" + StripGenericArity(tr.Name);
        if (tsNameMap.TryGetValue(key, out var ts))
            return ts;

        // Unknown complex type
        return SanitizeTsName(tr.Name);
    }

    private static string? MapClrToTs(string clr)
    {
        // Normalize
        var t = StripGenericArity(clr);
        switch (t)
        {
            case "String":    // reflection names
            case "string":
                return "string";
            case "Char":
            case "Guid":
            case "DateTime":
            case "DateTimeOffset":
            case "TimeOnly":
            case "DateOnly":
                return "string"; // ISO-ish
            case "Boolean":
            case "bool":
                return "boolean";
            case "Int16":
            case "Int32":
            case "Int64":
            case "UInt16":
            case "UInt32":
            case "UInt64":
            case "Single":
            case "Double":
            case "Decimal":
            case "short":
            case "int":
            case "long":
            case "float":
            case "double":
            case "decimal":
                return "number";
            case "Object":
            case "object":
                return "any";
            default:
                return null; // let caller resolve
        }
    }

    // ----------------- Source discovery helpers -----------------

    private static string TrimTrailingSlash(string s) => s.EndsWith("/") ? s.TrimEnd('/') : s;

    private static string StripGenericArity(string name)
    {
        var idx = name.IndexOf('`');
        return idx > 0 ? name[..idx] : name;
    }

    private static string SanitizeTsName(string name)
        => StripGenericArity(name)
            .Replace("<", "_")
            .Replace(">", "")
            .Replace(", ", "_")
            .Replace(",", "_")
            .Replace(".", "_");

    private static string ToCamel(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return char.ToLowerInvariant(s[0]) + s.Substring(1);
    }

    private static string RemoveSuffix(string s, string suffix)
        => s != null && s.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)
           ? s[..^suffix.Length]
           : s;

    private static string GetLeaf(string fullName)
    {
        var i = fullName.LastIndexOf('.');
        return i >= 0 ? fullName[(i + 1)..] : fullName;
    }

    private static string? FindRepositoryRoot()
    {
        // Walk up from the app base directory looking for a .sln or .git folder.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            bool hasSln = false, hasGit = false;
            try
            {
                hasSln = dir.EnumerateFiles("*.sln", SearchOption.TopDirectoryOnly).Any();
                hasGit = dir.EnumerateDirectories(".git", SearchOption.TopDirectoryOnly).Any();
            }
            catch { /* ignore */ }

            if (hasSln || hasGit) return dir.FullName;

            if (string.Equals(dir.Name, "bin", StringComparison.OrdinalIgnoreCase) && dir.Parent?.Parent != null)
                return dir.Parent.Parent.FullName;

            dir = dir.Parent;
        }
        return null;
    }

    private static readonly Regex TypeDeclarationRegex = new(
        @"\b(?:public|internal|protected|private)?\s*(?:sealed\s+|abstract\s+|partial\s+)?\s*(?:class|record\s+struct|record|struct|enum)\s+(?<name>\w+)\b",
        RegexOptions.Compiled);

    private static string? FindSourceCodeForType(Type type, string root)
    {
        foreach (var file in Directory.EnumerateFiles(root, "*.cs", SearchOption.AllDirectories))
        {
            string text;
            try { text = File.ReadAllText(file); }
            catch { continue; }

            if (!string.IsNullOrEmpty(type.Namespace) && !text.Contains($"namespace {type.Namespace}"))
                continue;

            if (!(text.Contains($"class {StripGenericArity(type.Name)}") ||
                  text.Contains($"record {StripGenericArity(type.Name)}") ||
                  text.Contains($"struct {StripGenericArity(type.Name)}") ||
                  text.Contains($"enum {StripGenericArity(type.Name)}")))
            {
                continue;
            }

            foreach (Match m in TypeDeclarationRegex.Matches(text))
            {
                var declared = m.Groups["name"].Value;
                if (string.Equals(declared, StripGenericArity(type.Name), StringComparison.Ordinal))
                    return text;
            }
        }
        return null;
    }

    // ----------------- Reflection / grouping helpers -----------------

    private static string? GetArg(string[] args, string key)
    {
        var idx = Array.FindIndex(args, a => a.Equals(key, StringComparison.OrdinalIgnoreCase));
        return (idx >= 0 && idx + 1 < args.Length) ? args[idx + 1] : null;
    }

    private static string InferRouteFromName(Type t)
        => t.Name.Replace("Operation", string.Empty, StringComparison.OrdinalIgnoreCase)
                 .ToLowerInvariant();

    private static Type? GetOperationInterface(Type t)
    {
        foreach (var i in t.GetInterfaces())
        {
            if (!i.IsGenericType) continue;
            var def = i.GetGenericTypeDefinition();
            if (def == typeof(IOperation<,>) || def == typeof(IStreamableOperation<,>))
                return i;
        }
        return null;
    }

    private static IEnumerable<Type> SafeGetTypes(Assembly asm)
    {
        try { return asm.GetTypes(); }
        catch (ReflectionTypeLoadException ex) { return ex.Types.Where(x => x != null)!; }
    }

    private static (string? module, string? aggregate) ParseModuleAndAggregate(Type t)
    {
        var ns = t.Namespace ?? string.Empty;
        var parts = ns.Split('.');
        var idx = Array.IndexOf(parts, "Modules");
        if (idx >= 0 && idx + 1 < parts.Length)
        {
            var module = parts[idx + 1];
            var aggregate = (idx + 2 < parts.Length && !parts[idx + 2].Equals("Operations", StringComparison.OrdinalIgnoreCase))
                ? parts[idx + 2]
                : null;
            return (module, aggregate);
        }
        return (null, null);
    }

    private static string? ParseModuleFromNamespace(string? ns)
    {
        if (string.IsNullOrEmpty(ns)) return null;
        var parts = ns.Split('.');
        var idx = Array.IndexOf(parts, "Modules");
        if (idx >= 0 && idx + 1 < parts.Length)
            return parts[idx + 1];
        return null;
    }

    private static (bool isCrud, CrudKind kind) ClassifyCrud(string typeName)
    {
        var name = typeName.EndsWith("Operation", StringComparison.OrdinalIgnoreCase)
            ? typeName[..^"Operation".Length]
            : typeName;

        if (name.StartsWith("Create", StringComparison.OrdinalIgnoreCase)) return (true, CrudKind.Create);
        if (name.StartsWith("Get", StringComparison.OrdinalIgnoreCase) ||
            name.StartsWith("Read", StringComparison.OrdinalIgnoreCase)) return (true, CrudKind.Read);
        if (name.StartsWith("List", StringComparison.OrdinalIgnoreCase) ||
            name.StartsWith("Find", StringComparison.OrdinalIgnoreCase) ||
            name.StartsWith("Search", StringComparison.OrdinalIgnoreCase)) return (true, CrudKind.List);
        if (name.StartsWith("Update", StringComparison.OrdinalIgnoreCase) ||
            name.StartsWith("Patch", StringComparison.OrdinalIgnoreCase)) return (true, CrudKind.Update);
        if (name.StartsWith("Delete", StringComparison.OrdinalIgnoreCase) ||
            name.StartsWith("Remove", StringComparison.OrdinalIgnoreCase)) return (true, CrudKind.Delete);

        return (false, CrudKind.Other);
    }

    private static int CrudOrderKey(CrudKind k) => k switch
    {
        CrudKind.Create => 0,
        CrudKind.Read => 1,
        CrudKind.List => 2,
        CrudKind.Update => 3,
        CrudKind.Delete => 4,
        _ => 9
    };
}

// ---------- Export model & helpers ----------

public sealed class ContractsExportModel
{
    public List<ModuleExport> Modules { get; set; } = new();
    public List<OperationInfo> Operations { get; } = new();
    public List<DtoSchema> Dtos { get; } = new();

    public RawCodeSection RawCode { get; set; } = new();
}

public sealed class RawCodeSection
{
    public RawCodeLanguage CSharp { get; set; } = new();
    public RawCodeLanguage TypeScript { get; set; } = new();
}

public sealed class RawCodeLanguage
{
    public List<string> Dtos { get; set; } = new();
    public List<string> Operations { get; set; } = new();
}

public sealed class ModuleExport
{
    public string Name { get; set; } = default!;
    public List<OperationInfo> Operations { get; set; } = new();
}

public enum CrudKind { Create, Read, List, Update, Delete, Other }

public sealed class OperationInfo
{
    public string OperationClass { get; set; } = default!;
    public string Route { get; set; } = default!;
    public bool Authorized { get; set; }
    public bool IsStream { get; set; }
    public TypeRef Request { get; set; } = default!;
    public TypeRef Response { get; set; } = default!;

    public string? Module { get; set; }
    public string? Aggregate { get; set; }
    public bool IsCrud { get; set; }
    public CrudKind CrudKind { get; set; }
}

public sealed record TypeRef(string Name, string? Namespace, bool IsCollection = false, TypeRef? ElementType = null)
{
    public static TypeRef From(Type t) => Create(t);

    private static TypeRef Create(Type t)
    {
        if (t.IsArray) return new TypeRef(GetNiceName(t), t.Namespace, true, From(t.GetElementType()!));
        if (t.TryGetEnumerableElement(out var elem))
            return new TypeRef(GetNiceName(t), t.Namespace, true, From(elem));
        return new TypeRef(GetNiceName(t), t.Namespace);
    }

    private static string GetNiceName(Type t)
    {
        if (!t.IsGenericType) return t.Name;
        var name = t.Name[..t.Name.IndexOf('`')];
        var args = string.Join(", ", t.GetGenericArguments().Select(GetNiceName));
        return $"{name}<{args}>";
    }
}

public sealed class DtoSchema
{
    public string Name { get; set; } = default!;
    public string? Namespace { get; set; }
    public bool IsEnum { get; set; }
    public string? EnumUnderlyingType { get; set; }
    public List<string>? EnumNames { get; set; }
    public List<PropertySchema>? Properties { get; set; }
}

public sealed class PropertySchema
{
    public string Name { get; set; } = default!;
    public string TypeName { get; set; } = default!;
    public string? Namespace { get; set; }
    public bool Nullable { get; set; }
    public bool IsCollection { get; set; }
    public TypeRef? ElementType { get; set; }
    public List<TypeRef>? GenericArguments { get; set; }
}

// ----- reflection helpers & visitor (with AmbiguousMatch handling) -----

file static class ReflectionExt
{
    public static bool IsAssignableFromGeneric(this Type generic, Type? type)
    {
        if (type == null) return false;
        if (type == generic) return true;
        if (type.IsGenericType && type.GetGenericTypeDefinition() == generic) return true;
        foreach (var i in type.GetInterfaces())
            if (i.IsGenericType && i.GetGenericTypeDefinition() == generic) return true;
        return type.BaseType != null && generic.IsAssignableFromGeneric(type.BaseType);
    }

    public static bool TryGetEnumerableElement(this Type t, out Type elementType)
    {
        if (t.IsArray) { elementType = t.GetElementType()!; return true; }

        var ienum = t.GetInterfaces()
            .Concat(t.IsInterface ? new[] { t } : Array.Empty<Type>())
            .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEnumerable<>));
        if (ienum != null)
        {
            elementType = ienum.GetGenericArguments()[0];
            return true;
        }

        elementType = null!;
        return false;
    }

    public static bool IsSystemPrimitiveLike(this Type t)
    {
        if (t.IsPrimitive) return true;
        return t == typeof(string) || t == typeof(decimal) || t == typeof(DateTime)
            || t == typeof(Guid) || t == typeof(DateOnly) || t == typeof(TimeOnly)
            || t == typeof(DateTimeOffset);
    }
}

file sealed class TypeGraphVisitor
{
    private readonly ContractsExportModel _model;
    private readonly Dictionary<string, DtoSchema> _dtoIndex = new();
    private readonly HashSet<Type> _visiting = new();

    public TypeGraphVisitor(ContractsExportModel model) => _model = model;

    public void VisitType(Type t)
    {
        if (t is null) return;

        if (t.TryGetEnumerableElement(out var elem))
        {
            VisitType(elem);
            return;
        }

        if (Nullable.GetUnderlyingType(t) is Type nt)
        {
            VisitType(nt);
            return;
        }

        if (t.IsSystemPrimitiveLike()) return;

        if (t.IsEnum) { AddEnum(t); return; }

        if (!t.IsClass && !t.IsValueType) return;

        if (!_visiting.Add(t)) return;

        try
        {
            var dto = BuildSchema(t);
            var key = $"{t.Namespace}|{t.FullName}";
            if (!_dtoIndex.ContainsKey(key))
            {
                _dtoIndex.Add(key, dto);
                _model.Dtos.Add(dto);
            }

            if (dto.Properties is { Count: > 0 })
            {
                foreach (var p in dto.Properties)
                {
                    if (p.IsCollection && p.ElementType is not null)
                        VisitType(ResolveType(t.Assembly, p.ElementType));

                    if (p.GenericArguments is { Count: > 0 })
                        foreach (var ga in p.GenericArguments)
                            VisitType(ResolveType(t.Assembly, ga));

                    var pt = ResolvePropertyType(t, p);
                    VisitType(pt);
                }
            }
        }
        finally { _visiting.Remove(t); }
    }

    private static Type ResolveType(Assembly asm, TypeRef tr)
    {
        var candidates = asm.GetTypes().Where(x => x.Name == tr.Name || x.FullName == tr.Name).ToList();
        return candidates.FirstOrDefault(x => x.Namespace == tr.Namespace) ?? candidates.FirstOrDefault() ?? typeof(object);
    }

    private static Type ResolvePropertyType(Type owner, PropertySchema p)
    {
        try
        {
            var props = owner.GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.FlattenHierarchy)
                             .Where(x => x.Name == p.Name)
                             .ToArray();

            if (props.Length == 0) return typeof(object);
            if (props.Length == 1) return props[0].PropertyType;

            var selected = props.OrderByDescending(pi => GetInheritanceDepth(pi.DeclaringType)).First();
            return selected.PropertyType;
        }
        catch (AmbiguousMatchException)
        {
            var pi = owner.GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.FlattenHierarchy)
                          .FirstOrDefault(x => x.Name == p.Name);
            return pi?.PropertyType ?? typeof(object);
        }

        static int GetInheritanceDepth(Type? t)
        {
            int depth = 0; while (t != null) { depth++; t = t.BaseType; }
            return depth;
        }
    }

    private static DtoSchema BuildSchema(Type t)
    {
        if (t.IsEnum)
        {
            return new DtoSchema
            {
                Name = t.Name,
                Namespace = t.Namespace,
                IsEnum = true,
                EnumUnderlyingType = Enum.GetUnderlyingType(t).Name,
                EnumNames = Enum.GetNames(t).ToList()
            };
        }

        var props = new List<PropertySchema>();
        foreach (var pi in t.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var pType = pi.PropertyType;
            var nullable = Nullable.GetUnderlyingType(pType) != null;

            var isColl = pType.TryGetEnumerableElement(out var elem);
            TypeRef? elemRef = null;
            if (isColl && elem != null)
                elemRef = TypeRef.From(elem);

            List<TypeRef>? genArgs = null;
            if (pType.IsGenericType)
                genArgs = pType.GetGenericArguments().Select(TypeRef.From).ToList();

            var typeName = pType.IsGenericType
                ? $"{pType.Name[..pType.Name.IndexOf('`')]}<{string.Join(", ", pType.GetGenericArguments().Select(a => a.Name))}>"
                : pType.Name;

            props.Add(new PropertySchema
            {
                Name = pi.Name,
                TypeName = typeName,
                Namespace = pType.Namespace,
                Nullable = nullable || (!pType.IsValueType && IsRefTypeNullable(pi)),
                IsCollection = isColl,
                ElementType = elemRef,
                GenericArguments = genArgs
            });
        }

        return new DtoSchema
        {
            Name = FriendlyName(t),
            Namespace = t.Namespace,
            IsEnum = false,
            Properties = props
        };
    }

    private static string FriendlyName(Type t)
    {
        if (!t.IsGenericType) return t.Name;
        var name = t.Name[..t.Name.IndexOf('`')];
        return $"{name}<{string.Join(", ", t.GetGenericArguments().Select(FriendlyName))}>";
    }

#if NET6_0_OR_GREATER
    private static readonly NullabilityInfoContext _nullCtx = new();
#endif
    private static bool IsRefTypeNullable(PropertyInfo pi)
    {
#if NET6_0_OR_GREATER
        var info = _nullCtx.Create(pi);
        return info.WriteState == NullabilityState.Nullable || info.ReadState == NullabilityState.Nullable;
#else
        return false;
#endif
    }

    private void AddEnum(Type t)
    {
        var dto = BuildSchema(t);
        var key = $"{t.Namespace}|{t.FullName}";
        if (!_dtoIndex.ContainsKey(key))
        {
            _dtoIndex.Add(key, dto);
            _model.Dtos.Add(dto);
        }
    }
}
