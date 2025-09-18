using Genspire.Application.Features.Hello.Services;
using Genspire.Contracts.Dtos.Features.Hello;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;

[OperationGroup("Hello")]
[OperationRoute("hello/world/service")]
public sealed class HelloServiceOperation : OperationBase<HelloRequestDto, HelloResponseDto>
{
    private readonly IHelloService _hello;
    public HelloServiceOperation(IHelloService hello) => _hello = hello;
    // Optional: auth (return false -> forbidden)
    protected override Task<bool> AuthorizeAsync(HelloRequestDto req, CancellationToken ct = default) => Task.FromResult(true);
    // Optional: validation (return list to fail-fast)
    protected override Task<IReadOnlyList<string>?> ValidateAsync(HelloRequestDto req, CancellationToken ct = default)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(req.Name))
            errors.Add("Name is required.");
        return Task.FromResult(errors.Count == 0 ? null : (IReadOnlyList<string>?)errors);
    }

    // Required: your actual logic
    protected override Task<HelloResponseDto> HandleAsync(HelloRequestDto req) => Task.FromResult(new HelloResponseDto { Message = _hello.GetHello(req.Name!) });
    // Optional: typed failures instead of throwing (keeps vertical slice DTO semantics)
    // protected override Task<HelloResponseDto> OnForbiddenAsync(HelloRequestDto req)
    //     => Task.FromResult(new HelloResponseDto { Message = "Forbidden." });
    // protected override Task<HelloResponseDto> OnValidationFailedAsync(HelloRequestDto req, IReadOnlyList<string> errors)
    //     => Task.FromResult(new HelloResponseDto { Message = string.Join("; ", errors) });
}