using System.ComponentModel;

namespace Genspire.Application.Modules.GenAI.Common.Interfaces;
public interface IEncodedFile
{
    [DefaultValue("<base64-encoded-string-or-URL>")]
    public string Base64OrUrl { get; set; }

    [DefaultValue("image/png")]
    public string MimeType { get; set; }

    [DefaultValue("image.png")]
    public string FileName { get; set; }

    [DefaultValue(false)]
    public bool IsUrl { get; set; }
}