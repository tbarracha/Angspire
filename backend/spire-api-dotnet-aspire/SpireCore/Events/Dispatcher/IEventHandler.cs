namespace SpireCore.Events.Dispatcher;

public interface IEventHandler<in TEvent> where TEvent : IDomainEvent
{
    Task HandleEventAsync(TEvent @event, CancellationToken cancellationToken = default);
}

