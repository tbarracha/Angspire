import { Injectable, signal, Signal, WritableSignal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class KeyValueStateService {
  private readonly _store: WritableSignal<Map<string, any>> = signal(new Map());

  /** Set a value for a given key */
  set(key: string, value: any): void {
    this._store.update(store => {
      const newStore = new Map(store);
      newStore.set(key, value);
      return newStore;
    });
  }

  /** Get a signal for the value of a given key */
  get<T = any>(key: string): Signal<T | undefined> {
    return computed(() => this._store().get(key));
  }

  /** Check if a key exists */
  has(key: string): boolean {
    return this._store().has(key);
  }

  /** Delete a key */
  delete(key: string): void {
    this._store.update(store => {
      const newStore = new Map(store);
      newStore.delete(key);
      return newStore;
    });
  }

  /** Clear all keys */
  clear(): void {
    this._store.set(new Map());
  }
}
