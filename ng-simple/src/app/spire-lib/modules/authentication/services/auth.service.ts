/**************************************************************************************************
 *  AUTH SERVICE – cache identity for F5 rehydration + consistent login/logout flows
 **************************************************************************************************/

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EventEmitter, inject, Injectable } from '@angular/core';
import { Observable, EMPTY, map, switchMap, tap, defaultIfEmpty } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import {
  AuthResponseDto,
  LoginRequestDto,
  RegisterUserRequestDto,
  RegisterServiceRequestDto,
  RefreshTokenRequestDto,
} from '../models/auth-models';

import {
  JwtIdentityDto,
  JwtUserIdentityDto,
  JwtServiceIdentityDto,
} from '../models/jwt-identity-dto';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly accessTokenKey = environment.authentication.tokenKey;
  private readonly refreshTokenKey = environment.authentication.refreshTokenKey;

  /** Optional: configure in env; defaults to 'auth.identity' */
  private readonly identityKey: string =
    (environment.authentication as any)?.identityKey ?? 'auth.identity';

  /** Generic events (back-compat) */
  static readonly onLogin = new EventEmitter<JwtIdentityDto>();
  static readonly onLogout = new EventEmitter<void>();

  /** Human-specific */
  static readonly onUserLogin = new EventEmitter<JwtUserIdentityDto>();
  static readonly onUserLogout = new EventEmitter<void>();

  /** Service-specific */
  static readonly onServiceLogin = new EventEmitter<JwtServiceIdentityDto>();
  static readonly onServiceLogout = new EventEmitter<void>();

  /* ------------------------- LOGIN ------------------------- */

  login(dto: LoginRequestDto): Observable<JwtIdentityDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/login`, dto).pipe(
      tap(res => this.storeTokens(res)),
      // If token is present & valid, try to resolve identity from server…
      switchMap(() => this.getJwtIdentityOrSkip()),
      // …otherwise fall back to decoding the token we just stored:
      defaultIfEmpty(this.decodeIdentityFromToken() as JwtIdentityDto),
      tap(identity => this.emitLogin(identity as JwtIdentityDto))
    );
  }

  /* --------------------- REGISTER USER --------------------- */

  registerUser(dto: RegisterUserRequestDto): Observable<JwtUserIdentityDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/register/user`, dto).pipe(
      tap(res => this.storeTokens(res)),
      switchMap(() => this.getJwtIdentityOrSkip()),
      defaultIfEmpty(this.decodeIdentityFromToken() as JwtUserIdentityDto),
      map(i => i as JwtUserIdentityDto),
      tap(i => this.emitLogin(i as JwtIdentityDto))
    );
  }

  /* -------------------- REGISTER SERVICE -------------------- */

  registerService(dto: RegisterServiceRequestDto): Observable<JwtServiceIdentityDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/register/service`, dto).pipe(
      tap(res => this.storeTokens(res)),
      switchMap(() => this.getJwtIdentityOrSkip()),
      defaultIfEmpty(this.decodeIdentityFromToken() as unknown as JwtServiceIdentityDto),
      map(i => i as JwtServiceIdentityDto),
      tap(i => this.emitLogin(i as JwtIdentityDto))
    );
  }

  /* --------------------- JWT IDENTITY --------------------- */

  /** Identity endpoint; guarded to return EMPTY if we can't/shouldn't call it. */
  public getJwtIdentity(): Observable<JwtIdentityDto> {
    const token = this.getAccessToken();
    if (!token || !this.isTokenValid(token)) return EMPTY;

    return this.http.post<JwtIdentityDto>(
      `${this.apiUrl}/auth/get/jwtidentity`,
      { token }, // matches the server DTO
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }

  /** Wrapper used by login/registration to “continue if not available”. */
  private getJwtIdentityOrSkip(): Observable<JwtIdentityDto> {
    return this.getJwtIdentity(); // returns EMPTY if no/invalid token
  }

  /** @deprecated – use getJwtIdentity() instead. */
  public getJwtUser(): Observable<JwtUserIdentityDto> {
    return this.getJwtIdentity() as Observable<JwtUserIdentityDto>;
  }

  /* ------------------- REFRESH TOKEN ------------------- */

  refreshToken(): Observable<AuthResponseDto> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) throw new Error('No refresh token available');

    const payload: RefreshTokenRequestDto = { refreshToken };

    return this.http
      .post<AuthResponseDto>(`${this.apiUrl}/auth/refresh`, payload)
      .pipe(
        tap(res => {
          this.storeTokens(res);
          // keep cached identity fresh after refresh
          const id = this.decodeIdentityFromToken();
          if (id) this.setCachedIdentity(id as JwtIdentityDto);
        })
      );
  }

  /* ----------- CURRENT USER PROFILE (unchanged) ----------- */

  getCurrentUser(): Observable<any> {
    const token = this.getAccessToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/authentication/me`, { headers });
  }

  /* --------------------- HELPERS --------------------- */

  logout(): void {
    const token = this.getAccessToken();
    if (token) this.emitLogout(token);

    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.identityKey); // clear cached identity

    AuthService.onLogout.emit();
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return token != null && this.isTokenValid(token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  private storeTokens(res: AuthResponseDto): void {
    localStorage.setItem(this.accessTokenKey, res.accessToken);
    localStorage.setItem(this.refreshTokenKey, res.refreshToken);

    // Best-effort snapshot so the app can hydrate after F5 without a roundtrip
    const localIdentity = this.decodeIdentityFromToken();
    if (localIdentity) this.setCachedIdentity(localIdentity as JwtIdentityDto);
  }

  private isTokenValid(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const expired = Date.now() > decoded.exp * 1000;
      if (expired) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Public so other services/components can rehydrate without I/O if needed. */
  public decodeIdentityFromToken(): JwtUserIdentityDto | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return {
        id: decoded.sub ?? decoded.userId ?? '',
        issuer: decoded.iss ?? '',
        isService: decoded.isService === true || decoded.client_id != null,
        rawClaims: decoded,
        email: decoded.email ?? '',
        userName: decoded.preferred_username ?? decoded.name ?? '',
        displayName: decoded.name ?? '',
        firstName: decoded.given_name ?? '',
        lastName: decoded.family_name ?? '',
      } as JwtUserIdentityDto;
    } catch {
      return null;
    }
  }

  /* ------------------- identity cache helpers ------------------- */

  getCachedIdentity(): JwtIdentityDto | null {
    try {
      const raw = localStorage.getItem(this.identityKey);
      return raw ? (JSON.parse(raw) as JwtIdentityDto) : null;
    } catch {
      return null;
    }
  }

  private setCachedIdentity(identity: JwtIdentityDto | null) {
    if (!identity) {
      localStorage.removeItem(this.identityKey);
      return;
    }
    localStorage.setItem(this.identityKey, JSON.stringify(identity));
  }

  /* ------------------- internal event helpers ------------------- */

  private emitLogin(identity: JwtIdentityDto): void {
    // Cache the authoritative identity we just received
    this.setCachedIdentity(identity);

    AuthService.onLogin.emit(identity);

    if (identity?.isService) {
      AuthService.onServiceLogin.emit(identity as JwtServiceIdentityDto);
    } else {
      AuthService.onUserLogin.emit(identity as JwtUserIdentityDto);
    }
  }

  private emitLogout(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      const isService = decoded.isService === true || decoded.client_id !== undefined;

      if (isService) {
        AuthService.onServiceLogout.emit();
      } else {
        AuthService.onUserLogout.emit();
      }
    } catch {
      /* silent – malformed token means we can't classify */
    }
  }
}
