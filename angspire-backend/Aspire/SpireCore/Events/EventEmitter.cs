// -----------------------------------------------------------------------------
// Author: Tiago Barracha <ti.barracha@gmail.com>
// Created with AI assistance (ChatGPT)
// Description: Standalone, type-safe event emitter class similar to Angular's EventEmitter.
// Supports subscribing, unsubscribing, and emitting listeners with up to 6 arguments.
// Provides subscriber count and check for existing subscribers.
// -----------------------------------------------------------------------------
//
// USAGE:
//
// var emitter = new EventEmitter();
//
// void HandleEvent()
// {
//     Console.WriteLine("Event triggered!");
// }
//
// emitter.Subscribe(HandleEvent);   // Adds the listener
// emitter.Emit();                   // Invokes all listeners ? "Event triggered!"
// emitter.Unsubscribe(HandleEvent); // Removes the listener
// emitter.Emit();                   // No output, listener removed
//
// You can also check:
//   emitter.HasSubscribers   ? true if any listeners are registered
//   emitter.SubscriberCount  ? the total number of subscribers
//
// For events with arguments, use EventEmitter<T>, EventEmitter<T1, T2>, etc.
//
// -----------------------------------------------------------------------------

namespace SpireCore.Events;

public class EventEmitter
{
    private readonly List<Action> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action listener) => _listeners.Remove(listener);

    public void Emit()
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke();
    }

    public void Clear() => _listeners.Clear();
}

public class EventEmitter<T>
{
    private readonly List<Action<T>> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action<T> listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action<T> listener) => _listeners.Remove(listener);

    public void Emit(T arg)
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke(arg);
    }

    public void Clear() => _listeners.Clear();
}

public class EventEmitter<T1, T2>
{
    private readonly List<Action<T1, T2>> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action<T1, T2> listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action<T1, T2> listener) => _listeners.Remove(listener);

    public void Emit(T1 arg1, T2 arg2)
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke(arg1, arg2);
    }

    public void Clear() => _listeners.Clear();
}

public class EventEmitter<T1, T2, T3>
{
    private readonly List<Action<T1, T2, T3>> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action<T1, T2, T3> listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action<T1, T2, T3> listener) => _listeners.Remove(listener);

    public void Emit(T1 arg1, T2 arg2, T3 arg3)
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke(arg1, arg2, arg3);
    }

    public void Clear() => _listeners.Clear();
}

public class EventEmitter<T1, T2, T3, T4>
{
    private readonly List<Action<T1, T2, T3, T4>> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action<T1, T2, T3, T4> listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action<T1, T2, T3, T4> listener) => _listeners.Remove(listener);

    public void Emit(T1 arg1, T2 arg2, T3 arg3, T4 arg4)
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke(arg1, arg2, arg3, arg4);
    }

    public void Clear() => _listeners.Clear();
}

public class EventEmitter<T1, T2, T3, T4, T5>
{
    private readonly List<Action<T1, T2, T3, T4, T5>> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action<T1, T2, T3, T4, T5> listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action<T1, T2, T3, T4, T5> listener) => _listeners.Remove(listener);

    public void Emit(T1 arg1, T2 arg2, T3 arg3, T4 arg4, T5 arg5)
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke(arg1, arg2, arg3, arg4, arg5);
    }

    public void Clear() => _listeners.Clear();
}

public class EventEmitter<T1, T2, T3, T4, T5, T6>
{
    private readonly List<Action<T1, T2, T3, T4, T5, T6>> _listeners = new();

    public bool HasSubscribers => _listeners.Count > 0;
    public int SubscriberCount => _listeners.Count;

    public void Subscribe(Action<T1, T2, T3, T4, T5, T6> listener)
    {
        if (!_listeners.Contains(listener))
            _listeners.Add(listener);
    }

    public void Unsubscribe(Action<T1, T2, T3, T4, T5, T6> listener) => _listeners.Remove(listener);

    public void Emit(T1 arg1, T2 arg2, T3 arg3, T4 arg4, T5 arg5, T6 arg6)
    {
        foreach (var listener in _listeners.ToArray())
            listener?.Invoke(arg1, arg2, arg3, arg4, arg5, arg6);
    }

    public void Clear() => _listeners.Clear();
}

