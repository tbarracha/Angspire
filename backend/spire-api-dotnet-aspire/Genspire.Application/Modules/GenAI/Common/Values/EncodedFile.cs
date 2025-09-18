using Genspire.Application.Modules.GenAI.Common.Interfaces;
using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Values;
public record EncodedFile : IEncodedFile
{
    [DefaultValue("<base64-encoded-string-or-URL>")]
    public string Base64OrUrl { get; set; } = string.Empty;

    [DefaultValue("image/png")]
    public string MimeType { get; set; } = "image/png";

    [DefaultValue("image.png")]
    public string FileName { get; set; } = "image.png";

    [DefaultValue(false)]
    public bool IsUrl { get; set; } = false;
}