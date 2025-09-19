using SpireCore.Services;

namespace Genspire.Application.Features.Hello.Services;
public interface IHelloService
{
    string GetHello();
    string GetHello(string name);
}

public class HelloService : IHelloService, ITransientService
{
    public string GetHello() => "Hello, World!";
    public string GetHello(string name) => $"Hello, {name}";
}