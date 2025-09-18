
namespace SpireCore.Events.Dispatcher;

public interface IEventDispatcher
{
    Task PublishEventAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IDomainEvent;
}

