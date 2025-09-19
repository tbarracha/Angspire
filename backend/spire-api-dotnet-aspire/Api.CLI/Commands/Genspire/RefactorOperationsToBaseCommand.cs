using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using SpireCore.Commands;
using System.Text;
using System.Text.RegularExpressions;

namespace Genspire.CLI.Commands.Genspire;

/// <summary>
/// Bulk refactor: IOperation<TReq,TRes> → OperationBase<TReq,TRes>.
/// Rewrites ExecuteAsync(...) → protected override HandleAsync(...).
/// </summary>
public sealed class RefactorOperationsToBaseCommand : BaseCommand
{
    public override string Name => "refactor-operations-to-base";

    public override CommandResult Execute(CommandContext context)
    {
        var args = context.Args ?? Array.Empty<string>();
        var rootArg = GetArg(args, "--root") ?? Directory.GetCurrentDirectory();
        var solutionArg = GetArg(args, "--solution");                // optional: explicit .sln
        var projectArg = GetArg(args, "--project");                 // optional: explicit .csproj

        // Includes: if empty → scan ALL .cs
        var includeArg = GetArg(args, "--include");
        var include = string.IsNullOrWhiteSpace(includeArg)
            ? Array.Empty<string>()
            : includeArg.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);

        // Add sensible default excludes, can be augmented via --exclude
        var excludeArg = GetArg(args, "--exclude");
        var exclude = (string.IsNullOrWhiteSpace(excludeArg)
                ? new[] { "**/bin/**", "**/obj/**", "**/.git/**" }
                : excludeArg.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Concat(new[] { "**/bin/**", "**/obj/**", "**/.git/**" }))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var dryRun = HasFlag(args, "--dry-run");
        var backup = HasFlag(args, "--backup");
        var addHooks = HasFlag(args, "--add-hooks");
        var noSeal = HasFlag(args, "--no-seal");
        var allowCt = HasFlag(args, "--allow-ct"); // rewrite ExecuteAsync(req, ct) if 'ct' unused

        // ── Auto-discovery of solution + Application project ─────────────────────────
        var rootToScan = ResolveScanRoot(rootArg, solutionArg, projectArg,
            out var foundSolution, out var foundProject);

        Console.WriteLine("[refactor-operations-to-base] Discovery");
        Console.WriteLine($"  Start Root   : {rootArg}");
        Console.WriteLine($"  Solution     : {foundSolution ?? "<none>"}");
        Console.WriteLine($"  Project      : {foundProject ?? "<none>"}");
        Console.WriteLine($"  Scan Root    : {rootToScan}");

        // ── Enumerate files and process ──────────────────────────────────────────────
        var files = EnumerateFiles(rootToScan, include, exclude).ToList();
        if (files.Count == 0)
        {
            Console.WriteLine("[refactor-operations-to-base] No files matched after discovery.");
            Console.WriteLine("  Hints:");
            Console.WriteLine("   • Use --project <path-to-*.Application.csproj>");
            Console.WriteLine("   • Or run with --root set to the Application project folder.");
            return CommandResult.Success();
        }

        int modified = 0, skipped = 0, total = files.Count;

        foreach (var path in files)
        {
            string original;
            try { original = File.ReadAllText(path); }
            catch { skipped++; continue; }

            var tree = CSharpSyntaxTree.ParseText(original);
            var rootNode = (CompilationUnitSyntax)tree.GetRoot();

            var rewriter = new OpToBaseRewriter(addHooks, noSeal, allowCt);
            var newRoot = (CompilationUnitSyntax)rewriter.Visit(rootNode);

            var newText = newRoot?.NormalizeWhitespace().ToFullString() ?? original;

            if (!string.Equals(newText, original, StringComparison.Ordinal))
            {
                Console.WriteLine($"[MODIFIED] {path}");
                modified++;

                if (!dryRun)
                {
                    if (backup && !File.Exists(path + ".bak"))
                        File.WriteAllText(path + ".bak", original, Encoding.UTF8);

                    File.WriteAllText(path, newText, Encoding.UTF8);
                }
            }
            else
            {
                skipped++;
            }
        }

        Console.WriteLine("[refactor-operations-to-base] Summary");
        Console.WriteLine($"  Root     : {rootToScan}");
        Console.WriteLine($"  Includes : {(include.Length == 0 ? "<ALL *.cs>" : string.Join(";", include))}");
        Console.WriteLine($"  Excludes : {string.Join(";", exclude)}");
        Console.WriteLine($"  DryRun   : {dryRun}");
        Console.WriteLine($"  Backup   : {backup}");
        Console.WriteLine($"  AddHooks : {addHooks}");
        Console.WriteLine($"  NoSeal   : {noSeal}");
        Console.WriteLine($"  AllowCT  : {allowCt}");
        Console.WriteLine($"  Files    : total={total}, modified={modified}, unchanged/skipped={skipped}");

        return CommandResult.Success();
    }

    /* ------------------------- discovery ------------------------- */

    private static string ResolveScanRoot(
    string startRoot,
    string? solutionArg,
    string? projectArg,
    out string? foundSolutionPath,
    out string? foundProjectPath)
    {
        // 1) Explicit project
        if (!string.IsNullOrWhiteSpace(projectArg) && File.Exists(projectArg))
        {
            foundProjectPath = Path.GetFullPath(projectArg);
            foundSolutionPath = solutionArg != null && File.Exists(solutionArg)
                ? Path.GetFullPath(solutionArg)
                : FindNearestSolutionDir(Path.GetDirectoryName(foundProjectPath)!)?.slnPath;
            return Path.GetDirectoryName(foundProjectPath)!;
        }

        // 2) Explicit solution
        if (!string.IsNullOrWhiteSpace(solutionArg) && File.Exists(solutionArg))
        {
            foundSolutionPath = Path.GetFullPath(solutionArg);
            var solDir = Path.GetDirectoryName(foundSolutionPath)!;
            foundProjectPath = FindApplicationProject(solDir);
            return foundProjectPath != null ? Path.GetDirectoryName(foundProjectPath)! : startRoot;
        }

        // 3) Auto-discover nearest .sln from startRoot
        var sol = FindNearestSolutionDir(startRoot); // (string dir, string slnPath)?
        if (sol.HasValue)
        {
            var (dir, slnPath) = sol.Value;          // deconstruct the Value
            foundSolutionPath = slnPath;
            foundProjectPath = FindApplicationProject(dir);
            if (foundProjectPath != null)
                return Path.GetDirectoryName(foundProjectPath)!;
        }
        else
        {
            foundSolutionPath = null;
        }

        // 4) Fallback
        foundProjectPath = null;
        return startRoot;
    }
    private static (string dir, string slnPath)? FindNearestSolutionDir(string start)
    {
        var dir = new DirectoryInfo(Path.GetFullPath(start));
        while (dir != null)
        {
            try
            {
                var sln = dir.EnumerateFiles("*.sln", SearchOption.TopDirectoryOnly).FirstOrDefault();
                if (sln != null) return (dir.FullName, sln.FullName);
            }
            catch { /* ignore */ }
            dir = dir.Parent;
        }
        return null;
    }

    private static string? FindApplicationProject(string solutionDir)
    {
        // Prefer *.Application.csproj, then *Application*.csproj
        var all = Directory.EnumerateFiles(solutionDir, "*.csproj", SearchOption.AllDirectories)
                           .ToArray();

        var strict = all.FirstOrDefault(p => p.EndsWith(".Application.csproj", StringComparison.OrdinalIgnoreCase));
        if (strict != null) return strict;

        var loose = all.FirstOrDefault(p => Path.GetFileName(p).Contains("Application", StringComparison.OrdinalIgnoreCase));
        return loose;
    }

    /* ------------------------- helpers ------------------------- */

    private static string? GetArg(string[] args, string key)
    {
        var idx = Array.FindIndex(args, a => a.Equals(key, StringComparison.OrdinalIgnoreCase));
        return (idx >= 0 && idx + 1 < args.Length) ? args[idx + 1] : null;
    }

    private static bool HasFlag(string[] args, string key)
        => args.Any(a => a.Equals(key, StringComparison.OrdinalIgnoreCase));

    private static IEnumerable<string> EnumerateFiles(string root, string[] includes, string[] excludes)
    {
        var all = Directory.EnumerateFiles(root, "*.cs", SearchOption.AllDirectories);
        var incRx = includes.Select(GlobToRegex).ToList();
        var excRx = excludes.Select(GlobToRegex).ToList();

        foreach (var f in all)
        {
            var rel = MakeRelativePath(root, f).Replace('\\', '/');

            if (incRx.Count > 0 && !incRx.Any(rx => rx.IsMatch(rel)))
                continue;
            if (excRx.Count > 0 && excRx.Any(rx => rx.IsMatch(rel)))
                continue;

            yield return f;
        }
    }

    private static Regex GlobToRegex(string glob)
    {
        var pattern = "^" + Regex.Escape(glob.Replace('\\', '/'))
            .Replace(@"\*\*", "§§DOUBLESTAR§§")
            .Replace(@"\*", "§§STAR§§")
            .Replace("§§DOUBLESTAR§§", ".*")
            .Replace("§§STAR§§", @"[^/]*")
            + "$";

        return new Regex(pattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
    }

    private static string MakeRelativePath(string root, string full)
    {
        var r = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var p = Path.GetFullPath(full);
        return p.StartsWith(r, StringComparison.OrdinalIgnoreCase) ? p.Substring(r.Length) : p;
    }
}

/* --------------------- Roslyn rewriter (unchanged) --------------------- */

file sealed class OpToBaseRewriter : CSharpSyntaxRewriter
{
    private readonly bool _addHooks;
    private readonly bool _noSeal;
    private readonly bool _allowCt;

    public OpToBaseRewriter(bool addHooks, bool noSeal, bool allowCt)
        => (_addHooks, _noSeal, _allowCt) = (addHooks, noSeal, allowCt);

    public override SyntaxNode? VisitCompilationUnit(CompilationUnitSyntax node)
    {
        var rewritten = (CompilationUnitSyntax)base.VisitCompilationUnit(node)!;

        // Ensure using SpireCore.API.Operations;
        var hasUsing = rewritten.Usings.Any(u =>
            string.Equals(u.Name.ToString(), "SpireCore.API.Operations", StringComparison.Ordinal));

        return hasUsing
            ? rewritten
            : rewritten.AddUsings(SyntaxFactory.UsingDirective(SyntaxFactory.ParseName("SpireCore.API.Operations")));
    }

    public override SyntaxNode? VisitClassDeclaration(ClassDeclarationSyntax node)
    {
        var updated = node;

        var iop = FindIOperation(node); // BaseTypeSyntax?
        bool replacedBase = false;

        if (iop is not null)
        {
            var g = GetGenericName(iop.Type)!;
            var req = g.TypeArgumentList.Arguments[0];
            var res = g.TypeArgumentList.Arguments[1];

            // Replace IOperation<,> with OperationBase<,>
            if (updated.BaseList is BaseListSyntax bl)
            {
                var newBase = SyntaxFactory.SimpleBaseType(
                    SyntaxFactory.GenericName("OperationBase")
                        .WithTypeArgumentList(SyntaxFactory.TypeArgumentList(
                            SyntaxFactory.SeparatedList(new[] { req, res }))));

                var newTypes = bl.Types.Where(t => t != iop).ToList();
                newTypes.Add(newBase);
                updated = updated.WithBaseList(bl.WithTypes(SyntaxFactory.SeparatedList(newTypes)));
            }
            else
            {
                var newBase = SyntaxFactory.BaseList(SyntaxFactory.SeparatedList(new[]
                {
                (BaseTypeSyntax)SyntaxFactory.SimpleBaseType(
                    SyntaxFactory.GenericName("OperationBase")
                        .WithTypeArgumentList(SyntaxFactory.TypeArgumentList(
                            SyntaxFactory.SeparatedList(new[] { req, res }))))
            }));
                updated = updated.WithBaseList(newBase);
            }

            replacedBase = true;
        }

        // --- Sealing rules (never seal abstract; seal only concrete classes we actually converted) ---
        if (replacedBase)
        {
            if (updated.Modifiers.Any(m => m.IsKind(SyntaxKind.AbstractKeyword)) &&
                updated.Modifiers.Any(m => m.IsKind(SyntaxKind.SealedKeyword)))
            {
                updated = updated.WithModifiers(Remove(updated.Modifiers, SyntaxKind.SealedKeyword));
            }

            if (!_noSeal
                && !updated.Modifiers.Any(m => m.IsKind(SyntaxKind.SealedKeyword))
                && !updated.Modifiers.Any(m => m.IsKind(SyntaxKind.AbstractKeyword)))
            {
                updated = updated.WithModifiers(updated.Modifiers.Add(SyntaxFactory.Token(SyntaxKind.SealedKeyword)));
            }
        }

        // --- Rename ExecuteAsync -> HandleAsync when the class *looks like* an Operation class ---
        var looksLikeOperation = replacedBase
            || InheritsOperationBase(updated)
            || InOperationsNamespace(updated)
            || updated.Identifier.Text.EndsWith("Operation", StringComparison.Ordinal);

        if (looksLikeOperation)
        {
            var members = new List<MemberDeclarationSyntax>();

            foreach (var m in updated.Members)
            {
                if (m is MethodDeclarationSyntax md && md.Identifier.Text == "ExecuteAsync")
                {
                    var pars = md.ParameterList.Parameters;

                    // 1 param → rename
                    if (pars.Count == 1)
                    {
                        members.Add(RewriteToHandle(md));
                        continue;
                    }

                    // 2 params (TReq, CancellationToken) and CT unused → drop CT and rename
                    if (pars.Count == 2 && _allowCt && IsCancellationToken(pars[1].Type) &&
                        !IdentifierUsed(md, pars[1].Identifier.Text))
                    {
                        var mdNoCt = md.WithParameterList(
                            SyntaxFactory.ParameterList(SyntaxFactory.SeparatedList(new[] { pars[0] })));
                        members.Add(RewriteToHandle(mdNoCt));
                        continue;
                    }
                }

                members.Add(m);
            }

            updated = updated.WithMembers(SyntaxFactory.List(members));
        }

        // (optional) add hooks only when we actually converted base or it clearly inherits OperationBase
        if (_addHooks && (replacedBase || InheritsOperationBase(updated)))
        {
            // only add if missing
            if (!updated.Members.OfType<MethodDeclarationSyntax>().Any(m => m.Identifier.Text == "AuthorizeAsync"))
            {
                var auth = SyntaxFactory.ParseMemberDeclaration(@"
protected override System.Threading.Tasks.Task<bool> AuthorizeAsync(object request, System.Threading.CancellationToken ct = default)
    => System.Threading.Tasks.Task.FromResult(true);
");
                // You can re-infer the actual TRequest with semantic model; for now object is safe.
                updated = updated.AddMembers(auth!);
            }
            if (!updated.Members.OfType<MethodDeclarationSyntax>().Any(m => m.Identifier.Text == "ValidateAsync"))
            {
                var val = SyntaxFactory.ParseMemberDeclaration(@"
protected override System.Threading.Tasks.Task<System.Collections.Generic.IReadOnlyList<string>?> ValidateAsync(object request, System.Threading.CancellationToken ct = default)
    => System.Threading.Tasks.Task.FromResult<System.Collections.Generic.IReadOnlyList<string>?>(null);
");
                updated = updated.AddMembers(val!);
            }
        }

        return base.VisitClassDeclaration(updated);
    }

    // helpers
    private static bool InheritsOperationBase(ClassDeclarationSyntax node)
        => node.BaseList?.Types.Any(t =>
        {
            var g = GetGenericName(t.Type);
            if (g is null) return false;
            var id = g.Identifier.Text;
            return id == "OperationBase" || id.EndsWith("Operation"); // catches AuthOperation<,> etc.
        }) == true;

    private static bool InOperationsNamespace(ClassDeclarationSyntax node)
    {
        string ns = "";
        var nsDecl = node.FirstAncestorOrSelf<NamespaceDeclarationSyntax>();
        if (nsDecl != null) ns = nsDecl.Name.ToString();
        var fileNs = node.FirstAncestorOrSelf<FileScopedNamespaceDeclarationSyntax>();
        if (fileNs != null) ns = fileNs.Name.ToString();
        return ns.Contains(".Operations", StringComparison.Ordinal) || ns.EndsWith("Operations", StringComparison.Ordinal);
    }

    private static bool IsCancellationToken(TypeSyntax type)
    {
        var text = type.ToString();
        return text == "CancellationToken" || text == "System.Threading.CancellationToken";
    }


    private static BaseTypeSyntax? FindIOperation(ClassDeclarationSyntax node)
    {
        if (node.BaseList is null) return null;

        foreach (var t in node.BaseList.Types)
        {
            var g = GetGenericName(t.Type);
            if (g is { Identifier.Text: "IOperation" } &&
                g.TypeArgumentList.Arguments.Count == 2)
            {
                return t;
            }
        }
        return null;
    }

    private static GenericNameSyntax? GetGenericName(TypeSyntax type) => type switch
    {
        GenericNameSyntax g => g,
        QualifiedNameSyntax q => q.Right as GenericNameSyntax,
        AliasQualifiedNameSyntax a => a.Name as GenericNameSyntax,
        _ => null
    };

    private static bool IdentifierUsed(MethodDeclarationSyntax method, string ident)
        => method.Body?.DescendantTokens().Any(t => t.ValueText == ident)
           ?? method.ExpressionBody?.DescendantTokens().Any(t => t.ValueText == ident)
           ?? false;

    private static MethodDeclarationSyntax RewriteToHandle(MethodDeclarationSyntax md)
    {
        var newMods = md.Modifiers;
        newMods = Remove(newMods, SyntaxKind.PublicKeyword);
        newMods = Remove(newMods, SyntaxKind.InternalKeyword);
        if (!newMods.Any(m => m.IsKind(SyntaxKind.ProtectedKeyword)))
            newMods = newMods.Insert(0, SyntaxFactory.Token(SyntaxKind.ProtectedKeyword));
        if (!newMods.Any(m => m.IsKind(SyntaxKind.OverrideKeyword)))
            newMods = newMods.Insert(1, SyntaxFactory.Token(SyntaxKind.OverrideKeyword));

        return md.WithIdentifier(SyntaxFactory.Identifier("HandleAsync"))
                 .WithModifiers(newMods);
    }

    private static SyntaxTokenList Remove(SyntaxTokenList mods, SyntaxKind kind)
    {
        var idx = mods.IndexOf(kind);
        return idx >= 0 ? mods.RemoveAt(idx) : mods;
    }
}
