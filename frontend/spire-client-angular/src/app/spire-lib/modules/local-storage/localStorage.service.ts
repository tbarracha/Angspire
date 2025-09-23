// localStorage.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

type StorageLike = {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();

  get length(): number { return this.map.size; }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value));
  }
  removeItem(key: string): void {
    this.map.delete(String(key));
  }
  clear(): void {
    this.map.clear();
  }
}

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly store: StorageLike;
  private readonly usingPersistent: boolean;

  constructor() {
    const wantPersistent = !!environment.useLocalStorage;
    const canUse = wantPersistent && this.storageAvailable();
    this.usingPersistent = canUse;

    this.store = canUse ? window.localStorage : new MemoryStorage();
    console.log(
      `[Storage] Using ${canUse ? 'localStorage' : 'in-memory'} store`
    );
  }

  /** Safely test if localStorage is truly usable in this context. */
  private storageAvailable(): boolean {
    try {
      // Access inside try – getter itself can throw in data: iframes
      const s = window.localStorage as StorageLike;
      const probe = '__probe__' + Math.random().toString(36).slice(2);
      s.setItem(probe, '1');
      s.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  // --- Public API (unchanged) ---

  get<T>(key: string): T | null {
    try {
      const raw = this.store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      console.error(`[Storage] get(${key}) failed:`, error);
      return null;
    }
  }

  set(key: string, value: any): void {
    try {
      this.store.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[Storage] set(${key}) failed:`, error);
    }
  }

  remove(key: string): void {
    try {
      this.store.removeItem(key);
    } catch (error) {
      console.error(`[Storage] remove(${key}) failed:`, error);
    }
  }

  clear(): void {
    try {
      this.store.clear();
    } catch (error) {
      console.error('[Storage] clear() failed:', error);
    }
  }

  has(key: string): boolean {
    try {
      return this.store.getItem(key) !== null;
    } catch (error) {
      console.error(`[Storage] has(${key}) failed:`, error);
      return false;
    }
  }

  keys(): string[] {
    try {
      const out: string[] = [];
      const n = this.store.length;
      for (let i = 0; i < n; i++) {
        const k = this.store.key(i);
        if (k != null) out.push(k);
      }
      return out;
    } catch (error) {
      console.error('[Storage] keys() failed:', error);
      return [];
    }
  }

  length(): number {
    try {
      return this.store.length;
    } catch (error) {
      console.error('[Storage] length() failed:', error);
      return 0;
    }
  }
}
