using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using Genspire.Application.Modules.GenAI.Common.Completions.Services;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;

namespace Genspire.Application.Modules.GenAI.Operations.ChatCompletions;
[OperationRoute("chat")]
public sealed class ChatCompletionOperation : OperationBase<ChatRequest, ChatResponse>
{
    private readonly ChatCompletionService _chatCompletionService;
    public ChatCompletionOperation(ChatCompletionService chatCompletionService)
    {
        _chatCompletionService = chatCompletionService;
    }

    protected override async Task<ChatResponse> HandleAsync(ChatRequest request)
    {
        var req = new ChatRequest()
        {
            Model = request.Model,
            Messages = request.Messages,
        };
        return await _chatCompletionService.CompleteAsync(req);
    }
}