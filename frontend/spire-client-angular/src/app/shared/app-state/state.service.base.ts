// state/state.service.base.ts
import { signal, WritableSignal } from '@angular/core';
import { LocalStorageService } from '../../lib/modules/local-storage/localStorage.service';

export interface StateServiceOptions<T> {
  /** Called with what was found in storage (or assembled from legacy). Return the final value to use. */
  migrate?: (raw: unknown) => T | null;
  /**
   * Legacy sources used to assemble an initial value when no record exists under `storageKey`.
   * Each entry can map a legacy key's value into a partial state object; null → ignore.
   */
  legacy?: Array<{ key: string; map: (value: unknown) => Partial<T> | null }>;
  /** If true, remove any legacy keys used during hydration. */
  cleanupLegacy?: boolean;
}

/** Generic, storage-backed state slice with signals + helpers. */
export abstract class StateService<T extends object> {
  protected readonly _state: WritableSignal<T>;

  constructor(
    protected readonly storage: LocalStorageService,
    protected readonly storageKey: string,
    protected readonly defaults: T,
    protected readonly options?: StateServiceOptions<T>
  ) {
    const hydrated = this.hydrate();
    this._state = signal<T>(hydrated);
  }

  /** Readonly signal for components. */
  get state() { return this._state.asReadonly(); }

  /** Current snapshot (immutable—do not mutate). */
  get snapshot(): Readonly<T> { return this._state(); }

  /** Replace the whole slice. */
  protected set(next: T): void {
    this._state.set(next);
    this.persist(next);
    this.onAfterSet(next);
  }

  /** Shallow patch. */
  protected patch(partial: Partial<T>): void {
    const next = { ...this._state(), ...partial } as T;
    this.set(next);
  }

  /** Functional update. */
  protected update(updater: (current: Readonly<T>) => T): void {
    const next = updater(this._state());
    this.set(next);
  }

  /** Reset to defaults and remove from storage. */
  reset(): void {
    this._state.set({ ...this.defaults });
    this.storage.remove(this.storageKey);
    this.onAfterSet(this._state());
  }

  /** Hook for subclasses to react to changes (optional). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onAfterSet(_next: Readonly<T>): void { /* no-op */ }

  // -------------------- internals --------------------

  private hydrate(): T {
    // try direct record
    const raw = this.storage.get<unknown>(this.storageKey);
    if (raw != null) {
      const migrated = this.options?.migrate?.(raw);
      if (migrated) return { ...this.defaults, ...migrated };
      if (isObject(raw)) return { ...this.defaults, ...(raw as object) } as T;
      return { ...this.defaults };
    }

    // try legacy assembly
    const legacy = this.options?.legacy ?? [];
    if (legacy.length > 0) {
      const assembled: Partial<T> = {};
      let usedAny = false;

      for (const l of legacy) {
        const val = this.storage.get<unknown>(l.key);
        if (val !== undefined && val !== null) {
          const patch = l.map(val);
          if (patch) {
            Object.assign(assembled, patch);
            usedAny = true;
          }
        }
      }

      if (usedAny) {
        const next = { ...this.defaults, ...assembled } as T;
        this.persist(next);
        if (this.options?.cleanupLegacy) {
          for (const l of legacy) this.storage.remove(l.key);
        }
        return next;
      }
    }

    // fallback to defaults
    return { ...this.defaults };
  }

  private persist(next: T): void {
    this.storage.set(this.storageKey, next);
  }
}

function isObject(v: unknown): v is object {
  return typeof v === 'object' && v !== null;
}
