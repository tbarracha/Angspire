// localStorage.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  /**
   * Get an item from localStorage
   * @param key The storage key
   * @returns The parsed value or null if not found
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item from localStorage: ${error}`);
      return null;
    }
  }

  /**
   * Set an item in localStorage
   * @param key The storage key
   * @param value The value to store (will be stringified)
   */
  set(key: string, value: any): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error setting item in localStorage: ${error}`);
    }
  }

  /**
   * Remove an item from localStorage
   * @param key The storage key to remove
   */
  remove(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from localStorage: ${error}`);
    }
  }

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return;
    }

    try {
      localStorage.clear();
    } catch (error) {
      console.error(`Error clearing localStorage: ${error}`);
    }
  }

  /**
   * Check if a key exists in localStorage
   * @param key The storage key to check
   * @returns True if the key exists
   */
  has(key: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`Error checking item in localStorage: ${error}`);
      return false;
    }
  }

  /**
   * Get all keys from localStorage
   * @returns Array of keys
   */
  keys(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return [];
    }

    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error(`Error getting keys from localStorage: ${error}`);
      return [];
    }
  }

  /**
   * Get the number of items in localStorage
   * @returns The number of items stored
   */
  length(): number {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return 0;
    }

    try {
      return localStorage.length;
    } catch (error) {
      console.error(`Error getting localStorage length: ${error}`);
      return 0;
    }
  }
} 