// state/auth-state.service.ts
import { Injectable, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../modules/authentication/services/auth.service';
import { LocalStorageService } from '../../lib/modules/local-storage/localStorage.service';
import { StateService } from './state.service.base';
import type { JwtIdentityDto, JwtUserIdentityDto } from '../../modules/authentication/models/jwt-identity-dto';
import { Observable } from 'rxjs';

export interface AuthState { user: JwtUserIdentityDto | null; }
const DEFAULT_AUTH_STATE: AuthState = { user: null };

@Injectable({ providedIn: 'root' })
export class AuthStateService extends StateService<AuthState> {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly loginRoute = '/login';
  private readonly redirectAfterLogin = '/home';

  readonly user = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => !!this.auth.getAccessToken());

  get bearerHeader(): Record<string, string> {
    const token = this.auth.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  constructor() {
    super(inject(LocalStorageService), 'app.auth.state', DEFAULT_AUTH_STATE, { legacy: [], cleanupLegacy: false });

    // ---- Cold-start hydration (no network): use cached identity or decode token
    const cached = this.auth.getCachedIdentity() ?? this.auth.decodeIdentityFromToken();
    if (cached && !cached.isService) {
      this.setUser(cached as JwtUserIdentityDto);
    } else {
      // If you prefer a network fallback here, you can uncomment:
      // this.auth.getJwtIdentity().subscribe({
      //   next: (id) => { if (id && !id.isService) this.setUser(id as JwtUserIdentityDto); }
      // });
    }

    // ---- LOGIN -> set user + route ----
    AuthService.onUserLogin.subscribe((u: JwtUserIdentityDto) => {
      this.setUser(u ?? null);
      this.router.navigate([this.redirectAfterLogin], { replaceUrl: true });
    });

    // ---- LOGOUT (handle ALL variants) -> clear user + route ----
    const handleLogout = () => {
      this.clearUser();
      this.router.navigate([this.loginRoute], { replaceUrl: true });
    };
    AuthService.onUserLogout.subscribe(handleLogout);
    AuthService.onServiceLogout.subscribe(handleLogout);
    AuthService.onLogout.subscribe(handleLogout);
  }

  // Convenience accessors used elsewhere in the app
  getAccessToken(): string | null { return this.auth.getAccessToken(); }
  getJwtIdentity$(): Observable<JwtIdentityDto> { return this.auth.getJwtIdentity(); }
  currentUser(): JwtUserIdentityDto | null { return this.user(); }

  private setUser(user: JwtUserIdentityDto | null) { this.patch({ user }); }
  private clearUser() { this.patch({ user: null }); }

  override reset() { super.reset(); }
}
