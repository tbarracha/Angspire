namespace SpireCore.API.Operations.Attributes;

public enum OperationFileContentType
{
    Zip,
    Pdf,
    Csv,
    Json,
    Xml,
    Png,
    Jpeg,
    Custom // fallback for any other
}

[AttributeUsage(AttributeTargets.Class)]
public class OperationProducesFileAttribute : Attribute
{
    public OperationFileContentType FileType { get; }
    public string ContentType { get; }

    public OperationProducesFileAttribute(OperationFileContentType fileType)
    {
        FileType = fileType;
        ContentType = fileType switch
        {
            OperationFileContentType.Zip => "application/zip",
            OperationFileContentType.Pdf => "application/pdf",
            OperationFileContentType.Csv => "text/csv",
            OperationFileContentType.Json => "application/json",
            OperationFileContentType.Xml => "application/xml",
            OperationFileContentType.Png => "image/png",
            OperationFileContentType.Jpeg => "image/jpeg",
            _ => "application/octet-stream"
        };
    }

    /// <summary>
    /// For full flexibility, still allow explicit override via string
    /// </summary>
    public OperationProducesFileAttribute(string customContentType)
    {
        FileType = OperationFileContentType.Custom;
        ContentType = customContentType;
    }
}

