using Microsoft.AspNetCore.Http;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SpireCore.API.Operations.Files;

// ===== Common binary abstraction =====
public interface IBinaryPart
{
    string FileName { get; }
    string? ContentType { get; }
    long Length { get; }
    Stream OpenReadStream();
}

public sealed class FormFileBinaryPart : IBinaryPart
{
    private readonly IFormFile _inner;
    public FormFileBinaryPart(IFormFile inner) => _inner = inner;
    public string FileName => _inner.FileName;
    public string? ContentType => _inner.ContentType;
    public long Length => _inner.Length;
    public Stream OpenReadStream() => _inner.OpenReadStream();
}

internal static class UploadBinder
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };
    private static readonly Regex _indexedKey = new(@"^(metadata|metadatas)\[\d+\]$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Builds TRequest from multipart form.
    /// Files:
    ///   - Accepts any number of file parts (names 'file', 'files', 'files[]', or anything in form.Files)
    ///   - Will set either:
    ///       * File : IBinaryPart                   (when exactly one file)
    ///       * Files : IEnumerable&lt;IBinaryPart&gt; | IBinaryPart[] (when one or many files; single file also supported)
    /// Metadata:
    ///   - "metadata" can be a single JSON object OR a JSON array.
    ///   - You can also repeat metadata fields (metadata, metadata[], metadatas, metadatas[], metadata[0] ...).
    ///   - Will set either:
    ///       * Metadata : T (single object)
    ///       * Metadatas : IEnumerable&lt;T&gt; | T[] (array)
    /// Pass-through:
    ///   - If request type has string properties "FileNameOverride"/"TargetSubfolder", they’re set from form fields with same names.
    /// </summary>
    internal static async Task<TRequest> BindAsync<TRequest>(HttpRequest http)
    {
        if (!http.HasFormContentType) throw new InvalidOperationException("Expected multipart/form-data");
        var form = await http.ReadFormAsync();
        var req = Activator.CreateInstance<TRequest>()!;

        var props = typeof(TRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance);

        // ---- FILES ----
        // Collect all files (we’ll be permissive on field names)
        var allFormFiles = form.Files?.Count > 0 ? form.Files.ToArray() : Array.Empty<IFormFile>();
        if (allFormFiles.Length == 0)
            throw new InvalidOperationException("Missing file parts");

        // Prepare binary wrappers
        var binaryParts = allFormFiles.Select(f => (IBinaryPart)new FormFileBinaryPart(f)).ToList();

        // Try to find File and/or Files properties
        var fileProp = props.FirstOrDefault(p =>
            p.CanWrite &&
            typeof(IBinaryPart).IsAssignableFrom(p.PropertyType) &&
            string.Equals(p.Name, "File", StringComparison.OrdinalIgnoreCase));

        var filesProp = props.FirstOrDefault(p =>
            p.CanWrite &&
            IsEnumerableOf(p.PropertyType, typeof(IBinaryPart), out _));

        if (binaryParts.Count == 1)
        {
            // Prefer 'File' if available; fall back to 'Files'
            if (fileProp is not null) fileProp.SetValue(req, binaryParts[0]);
            else if (filesProp is not null) SetEnumerable(filesProp, req, binaryParts, typeof(IBinaryPart));
        }
        else
        {
            // Many → expect 'Files'; if not present but 'File' exists, set first
            if (filesProp is not null) SetEnumerable(filesProp, req, binaryParts, typeof(IBinaryPart));
            else if (fileProp is not null) fileProp.SetValue(req, binaryParts[0]);
        }

        // ---- METADATA ----
        // Collect metadata strings from several conventions
        var metaStrings = GetAllMetadataStrings(form);

        // Decide which property to set: Metadata or Metadatas
        var metaProp = props.FirstOrDefault(p =>
            p.CanWrite &&
            string.Equals(p.Name, "Metadata", StringComparison.OrdinalIgnoreCase));

        var metasProp = props.FirstOrDefault(p =>
            p.CanWrite &&
            string.Equals(p.Name, "Metadatas", StringComparison.OrdinalIgnoreCase) &&
            IsEnumerable(p.PropertyType, out _));

        if (metasProp is not null)
        {
            // If single "metadata" contains a JSON array, deserialize directly into the property type.
            if (metaStrings.Count == 1 && LooksLikeJsonArray(metaStrings[0]))
            {
                var arr = JsonSerializer.Deserialize(metaStrings[0], metasProp.PropertyType, _json);
                if (arr is not null) metasProp.SetValue(req, arr);
            }
            else if (metaStrings.Count > 0)
            {
                // Deserialize each piece to element type and set a list/array
                IsEnumerable(metasProp.PropertyType, out var elemType);
                var list = CreateList(elemType!);
                foreach (var s in metaStrings)
                {
                    var item = DeserializeFlexible(s, elemType!);
                    list.Add(item);
                }
                SetEnumerable(metasProp, req, list, elemType!);
            }
            // else: nothing to set
        }
        else if (metaProp is not null)
        {
            // Single object target. If we got an array string, use first element.
            if (metaStrings.Count > 0)
            {
                var raw = metaStrings[0];
                if (LooksLikeJsonArray(raw))
                {
                    // try first element
                    try
                    {
                        using var doc = JsonDocument.Parse(raw);
                        if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                        {
                            var first = doc.RootElement[0].GetRawText();
                            var one = DeserializeFlexible(first, metaProp.PropertyType);
                            metaProp.SetValue(req, one);
                        }
                    }
                    catch { /* ignore */ }
                }
                else
                {
                    var one = DeserializeFlexible(raw, metaProp.PropertyType);
                    metaProp.SetValue(req, one);
                }
            }
        }

        // ---- Passthrough known string fields ----
        TrySetString(form, req, "fileNameOverride");
        TrySetString(form, req, "targetSubfolder");

        return req;
    }

    // ------------------ helpers ------------------

    private static bool LooksLikeJsonArray(string s)
        => s.AsSpan().TrimStart().StartsWith("[");

    private static object? DeserializeFlexible(string json, Type targetType)
    {
        if (targetType == typeof(string)) return json;
        try { return JsonSerializer.Deserialize(json, targetType, _json); }
        catch { return null; }
    }

    private static List<string> GetAllMetadataStrings(IFormCollection form)
    {
        var results = new List<string>();

        // 1) Common keys: metadata / metadatas (can appear multiple times)
        foreach (var key in form.Keys)
        {
            if (key.Equals("metadata", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("metadatas", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("metadata[]", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("metadatas[]", StringComparison.OrdinalIgnoreCase) ||
                _indexedKey.IsMatch(key))
            {
                foreach (var v in form[key])
                {
                    if (!string.IsNullOrWhiteSpace(v)) results.Add(v);
                }
            }
        }

        // 2) If nothing yet, try single "metadata" field by convention (the classic case)
        if (results.Count == 0)
        {
            var meta = form["metadata"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(meta)) results.Add(meta);
        }

        return results;
    }

    private static bool IsEnumerable(Type type, out Type? elemType)
    {
        elemType = null;

        if (type.IsArray)
        {
            elemType = type.GetElementType();
            return elemType != null;
        }

        if (type.IsGenericType)
        {
            var genDef = type.GetGenericTypeDefinition();
            if (genDef == typeof(IEnumerable<>) ||
                genDef == typeof(IReadOnlyList<>) ||
                genDef == typeof(IList<>) ||
                genDef == typeof(List<>))
            {
                elemType = type.GetGenericArguments()[0];
                return true;
            }
        }

        // check interfaces (e.g., property typed as IReadOnlyList<T>)
        var iface = type.GetInterfaces()
            .FirstOrDefault(i => i.IsGenericType &&
                                 (i.GetGenericTypeDefinition() == typeof(IEnumerable<>) ||
                                  i.GetGenericTypeDefinition() == typeof(IReadOnlyList<>)));
        if (iface != null)
        {
            elemType = iface.GetGenericArguments()[0];
            return true;
        }

        return false;
    }

    private static bool IsEnumerableOf(Type type, Type expectedElement, out Type? elemType)
    {
        if (IsEnumerable(type, out elemType))
        {
            if (elemType == expectedElement || expectedElement.IsAssignableFrom(elemType)) return true;
        }
        elemType = null;
        return false;
    }

    private static System.Collections.IList CreateList(Type elemType)
    {
        var listType = typeof(List<>).MakeGenericType(elemType);
        return (System.Collections.IList)Activator.CreateInstance(listType)!;
    }

    private static void SetEnumerable(PropertyInfo prop, object target, System.Collections.IEnumerable items, Type elemType)
    {
        var destType = prop.PropertyType;

        if (destType.IsArray)
        {
            // Materialize to array of element type
            var list = new List<object?>();
            foreach (var it in items) list.Add(it);
            var arr = Array.CreateInstance(elemType, list.Count);
            for (int i = 0; i < list.Count; i++) arr.SetValue(list[i], i);
            prop.SetValue(target, arr);
            return;
        }

        // If the property is an interface (IEnumerable<>, IReadOnlyList<>, IList<>) or List<>,
        // a List<T> instance is assignable to IReadOnlyList<T>/IEnumerable<T>/IList<T>.
        if (typeof(System.Collections.IEnumerable).IsAssignableFrom(destType))
        {
            // If we already have a concrete List<T> of the right type, use it.
            if (items.GetType().IsGenericType &&
                items.GetType().GetGenericTypeDefinition() == typeof(List<>) &&
                items.GetType().GetGenericArguments()[0] == elemType)
            {
                prop.SetValue(target, items);
                return;
            }

            var list = CreateList(elemType);
            foreach (var it in items) list.Add(it);
            prop.SetValue(target, list);
            return;
        }

        // Fallback: do nothing
    }

    private static void TrySetString<T>(IFormCollection form, T target, string propName)
    {
        var p = typeof(T).GetProperty(propName, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);
        if (p is null || !p.CanWrite || p.PropertyType != typeof(string)) return;
        var v = form[propName].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(v)) p.SetValue(target, v);
    }
}
