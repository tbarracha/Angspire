using Genspire.Contracts.Dtos.Features.Hello;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;

namespace Genspire.Application.Features.Hello.Operations;
[OperationGroup("Hello")]
[OperationRoute("hello/world")]
public sealed class HelloWorldOperation : OperationBase<HelloRequestDto, HelloResponseDto>
{
    protected override Task<HelloResponseDto> HandleAsync(HelloRequestDto request)
    {
        return Task.FromResult(new HelloResponseDto { Message = $"Hello, {request.Name} {request.LastName}!" });
    }
}