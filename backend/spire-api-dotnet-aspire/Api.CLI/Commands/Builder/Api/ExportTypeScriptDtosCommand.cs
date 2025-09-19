using SpireCore.Commands;
using System.Text.RegularExpressions;

namespace Genspire.CLI.Commands.Builder.Api;

public class ExportTypeScriptDtosCommand : BaseCommand
{
    public override string Name => "export-ts-dtos";

    // Matches any record/class/struct ending with Dto, Request, or Response
    private static readonly Regex ContractClassRegex = new(
        @"public\s+(?:partial\s+)?(?:record|class|struct|record\s+struct)\s+(?<name>\w+(Dto|Request|Response))\s*(?:<[^>]+>)?(?:\s*:\s*\w+)?\s*\{(?<body>[\s\S]*?)\}",
        RegexOptions.Compiled);

    // Matches public properties with get/set or get/init
    private static readonly Regex PropertyRegex = new(
        @"public\s+(?<type>[\w\?<>\[\]]+)\s+(?<name>\w+)\s*\{\s*get;\s*(set;|init;)\s*\}",
        RegexOptions.Compiled);

    public override CommandResult Execute(CommandContext context)
    {
        Console.WriteLine("Scanning for DTOs, Requests, and Responses in project...");
        var projectRoot = Directory.GetCurrentDirectory();
        var dtoList = new List<(string file, string dtoName, string tsDef)>();

        foreach (var file in Directory.EnumerateFiles(projectRoot, "*.cs", SearchOption.AllDirectories))
        {
            var code = File.ReadAllText(file);

            foreach (Match m in ContractClassRegex.Matches(code))
            {
                string dtoName = m.Groups["name"].Value;
                string classBody = m.Groups["body"].Value;
                var tsProps = new List<string>();

                foreach (Match p in PropertyRegex.Matches(classBody))
                {
                    string tsType = MapCSharpTypeToTypeScript(p.Groups["type"].Value);
                    string tsProp = $"{ToCamelCase(p.Groups["name"].Value)}: {tsType};";
                    tsProps.Add("    " + tsProp);
                }

                var tsClass = $"export interface {dtoName} {{\n{string.Join("\n", tsProps)}\n}}";
                dtoList.Add((file, dtoName, tsClass));
            }
        }

        // Output all DTOs/Requests/Responses
        foreach (var (file, dtoName, tsDef) in dtoList)
        {
            Console.WriteLine($"\n// {Path.GetFileName(file)}");
            Console.WriteLine(tsDef);
        }

        Console.WriteLine($"\nTotal contracts exported: {dtoList.Count}");
        return CommandResult.Success();
    }

    private static string MapCSharpTypeToTypeScript(string csType)
    {
        return csType switch
        {
            "string" => "string",
            "int" or "long" or "float" or "double" or "decimal" => "number",
            "bool" => "boolean",
            "Guid" => "string",
            "DateTime" => "string", // Consider ISO string
            var x when x.EndsWith("[]") => MapCSharpTypeToTypeScript(x.Replace("[]", "")) + "[]",
            var x when x.StartsWith("List<") => MapCSharpTypeToTypeScript(
                x.Replace("List<", "").Replace(">", "")) + "[]",
            _ => "any" // Fallback for unknown types
        };
    }

    private static string ToCamelCase(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return name;
        return char.ToLowerInvariant(name[0]) + name.Substring(1);
    }
}
