// -----------------------------------------------------------------------------
// Author: Tiago Barracha <ti.barracha@gmail.com>
// Created with AI assistance (ChatGPT)
// Description: Lazy wrappers for EventEmitter variants (0 to 6 parameters).
// Ensures emitters are only instantiated when used (lazy initialization).
// -----------------------------------------------------------------------------

namespace SpireCore.Events;

public class LazyEventEmitter
{
    private EventEmitter? _emitter;
    public EventEmitter Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit() => _emitter?.Emit();
    public void Subscribe(Action listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

public class LazyEventEmitter<T>
{
    private EventEmitter<T>? _emitter;
    public EventEmitter<T> Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit(T arg) => _emitter?.Emit(arg);
    public void Subscribe(Action<T> listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action<T> listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

public class LazyEventEmitter<T1, T2>
{
    private EventEmitter<T1, T2>? _emitter;
    public EventEmitter<T1, T2> Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit(T1 a, T2 b) => _emitter?.Emit(a, b);
    public void Subscribe(Action<T1, T2> listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action<T1, T2> listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

public class LazyEventEmitter<T1, T2, T3>
{
    private EventEmitter<T1, T2, T3>? _emitter;
    public EventEmitter<T1, T2, T3> Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit(T1 a, T2 b, T3 c) => _emitter?.Emit(a, b, c);
    public void Subscribe(Action<T1, T2, T3> listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action<T1, T2, T3> listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

public class LazyEventEmitter<T1, T2, T3, T4>
{
    private EventEmitter<T1, T2, T3, T4>? _emitter;
    public EventEmitter<T1, T2, T3, T4> Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit(T1 a, T2 b, T3 c, T4 d) => _emitter?.Emit(a, b, c, d);
    public void Subscribe(Action<T1, T2, T3, T4> listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action<T1, T2, T3, T4> listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

public class LazyEventEmitter<T1, T2, T3, T4, T5>
{
    private EventEmitter<T1, T2, T3, T4, T5>? _emitter;
    public EventEmitter<T1, T2, T3, T4, T5> Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit(T1 a, T2 b, T3 c, T4 d, T5 e) => _emitter?.Emit(a, b, c, d, e);
    public void Subscribe(Action<T1, T2, T3, T4, T5> listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action<T1, T2, T3, T4, T5> listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

public class LazyEventEmitter<T1, T2, T3, T4, T5, T6>
{
    private EventEmitter<T1, T2, T3, T4, T5, T6>? _emitter;
    public EventEmitter<T1, T2, T3, T4, T5, T6> Emitter => _emitter ??= new();
    public bool HasSubscribers => _emitter?.HasSubscribers == true;
    public int SubscriberCount => _emitter?.SubscriberCount ?? 0;
    public void Emit(T1 a, T2 b, T3 c, T4 d, T5 e, T6 f) => _emitter?.Emit(a, b, c, d, e, f);
    public void Subscribe(Action<T1, T2, T3, T4, T5, T6> listener) => Emitter.Subscribe(listener);
    public void Unsubscribe(Action<T1, T2, T3, T4, T5, T6> listener) => _emitter?.Unsubscribe(listener);
    public void Clear() => _emitter?.Clear();
}

