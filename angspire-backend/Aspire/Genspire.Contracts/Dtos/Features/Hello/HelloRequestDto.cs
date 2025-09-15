using System.ComponentModel;

namespace Genspire.Contracts.Dtos.Features.Hello;

public class HelloRequestDto
{
    [DefaultValue("Bruce")]
    public string Name { get; set; } = string.Empty;

    [DefaultValue("Wayne")]
    public string LastName { get; set; } = string.Empty;
}

