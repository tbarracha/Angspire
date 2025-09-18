
using Microsoft.Extensions.DependencyInjection;

namespace SpireCore.Events.Dispatcher;

public class InMemoryEventDispatcher : IEventDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    public InMemoryEventDispatcher(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task PublishEventAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IDomainEvent
    {
        var handlers = _serviceProvider.GetServices<IEventHandler<TEvent>>();

        foreach (var handler in handlers)
        {
            Console.WriteLine(
    $"Dispatching {typeof(TEvent).Name} to {handler.GetType().Name}");
            await handler.HandleEventAsync(@event, cancellationToken);
        }
    }
}

