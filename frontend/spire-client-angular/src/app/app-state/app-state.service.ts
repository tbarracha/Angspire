// state/app-state.service.ts
import { Injectable, inject, computed, signal } from '@angular/core';
import { KeyValueStateService } from './key-value-state.service';
import { Router } from '@angular/router';
import { LocalStorageService } from '../spire-lib/modules/local-storage/localStorage.service';
import { AuthService } from '../spire-lib/modules/authentication/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly authApi = inject(AuthService);
  private readonly keyValue  = inject(KeyValueStateService);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);

  private readonly storageKey = 'appState.keyValueStore';

  // User state signal
  private readonly _user = signal<any | null>(null);
  readonly currentUser = this._user.asReadonly();

  // Authentication status signal
  readonly isAuthenticated = computed(() => !!this.authApi.getAccessToken());

  // key-value store slice
  readonly store = this.keyValue;

  constructor() {
    // Load store from localStorage
    this.loadStore();

    // Cold start: hydrate user from cached identity or token
    const cached = this.authApi.getCachedIdentity() ?? this.authApi.decodeIdentityFromToken();
    if (cached && !cached.isService) {
      this._user.set(cached);
    }

    // Subscribe to login event on AuthService class static EventEmitter
    AuthService.onUserLogin.subscribe((u: any) => {
      this._user.set(u ?? null);
      this.router.navigate(['/home'], { replaceUrl: true });
      console.log("Logged in!");
    });

    // Subscribe to logout events on AuthService class static EventEmitters
    const handleLogout = () => {
      this._user.set(null);
      this.router.navigate(['/login'], { replaceUrl: true });
      console.log("Logged out!");
    };
    
    AuthService.onUserLogout.subscribe(handleLogout);
    AuthService.onServiceLogout.subscribe(handleLogout);
    AuthService.onLogout.subscribe(handleLogout);

    // Save store on changes
    this.storeChangeSubscription();
  }

  private storeChangeSubscription() {
    // Since keyValue store uses signals internally, we can create a computed to watch changes
    computed(() => {
      // Access the whole Map to track changes
      const map = this.keyValue['_store']();
      // Save to localStorage on any change
      this.saveStore();
      return map;
    });
  }

  saveStore() {
    const map = this.keyValue['_store']();
    // Convert Map to array for serialization
    const entries = Array.from(map.entries());
    this.storage.set(this.storageKey, entries);
  }

  loadStore() {
    const entries = this.storage.get<[string, any][]>(this.storageKey);
    if (entries && Array.isArray(entries)) {
      // Clear current store first
      this.keyValue.clear();
      // Restore entries
      for (const [key, value] of entries) {
        this.keyValue.set(key, value);
      }
    }
  }

  get accessToken(): string | null {
    return this.authApi.getAccessToken();
  }

  get bearerHeader(): Record<string, string> {
    const token = this.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  logout() {
    this.resetAll();
  }

  resetAll() {
    this.authApi.logout();
    this._user.set(null);
    this.keyValue.clear();
    this.storage.remove(this.storageKey);
  }
}
