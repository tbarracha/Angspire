// auth.service.ts
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
import { LocalStorageService } from '../../local-storage/localStorage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(LocalStorageService);

  private readonly apiUrl = environment.apiUrl;
  private readonly accessTokenKey = environment.authentication.tokenKey;
  private readonly refreshTokenKey = environment.authentication.refreshTokenKey;

  /** Optional: configure in env; defaults to 'auth.identity' */
  private readonly identityKey: string =
    (environment.authentication as any)?.identityKey ?? 'auth.identity';

  /** Events */
  static readonly onLogin = new EventEmitter<JwtIdentityDto>();
  static readonly onLogout = new EventEmitter<void>();
  static readonly onUserLogin = new EventEmitter<JwtUserIdentityDto>();
  static readonly onUserLogout = new EventEmitter<void>();
  static readonly onServiceLogin = new EventEmitter<JwtServiceIdentityDto>();
  static readonly onServiceLogout = new EventEmitter<void>();

  /* ------------------------- LOGIN ------------------------- */

  login(dto: LoginRequestDto): Observable<JwtIdentityDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/login`, dto).pipe(
      tap(res => this.storeTokens(res)),
      switchMap(() => this.getJwtIdentityOrSkip()),
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

  public getJwtIdentity(): Observable<JwtIdentityDto> {
    const token = this.getAccessToken();
    if (!token || !this.isTokenValid(token)) return EMPTY;

    return this.http.post<JwtIdentityDto>(
      `${this.apiUrl}/auth/get/jwtidentity`,
      { token },
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }

  private getJwtIdentityOrSkip(): Observable<JwtIdentityDto> {
    return this.getJwtIdentity(); // EMPTY if no/invalid token
  }

  /** @deprecated – use getJwtIdentity() instead. */
  public getJwtUser(): Observable<JwtUserIdentityDto> {
    return this.getJwtIdentity() as Observable<JwtUserIdentityDto>;
  }

  /* ------------------- REFRESH TOKEN ------------------- */

  refreshToken(): Observable<AuthResponseDto> {
    const refreshToken = this.storage.get<string>(this.refreshTokenKey);
    if (!refreshToken) throw new Error('No refresh token available');

    const payload: RefreshTokenRequestDto = { refreshToken };

    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/refresh`, payload).pipe(
      tap(res => {
        this.storeTokens(res);
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

    this.storage.remove(this.accessTokenKey);
    this.storage.remove(this.refreshTokenKey);
    this.storage.remove(this.identityKey);

    AuthService.onLogout.emit();
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return token != null && this.isTokenValid(token);
  }

  getAccessToken(): string | null {
    return this.storage.get<string>(this.accessTokenKey);
  }

  private storeTokens(res: AuthResponseDto): void {
    this.storage.set(this.accessTokenKey, res.accessToken);
    this.storage.set(this.refreshTokenKey, res.refreshToken);

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
    const raw = this.storage.get<string>(this.identityKey);
    try { return raw ? (JSON.parse(raw) as JwtIdentityDto) : null; }
    catch { return null; }
  }

  private setCachedIdentity(identity: JwtIdentityDto | null) {
    if (!identity) { this.storage.remove(this.identityKey); return; }
    this.storage.set(this.identityKey, identity);
  }

  /* ------------------- internal event helpers ------------------- */

  private emitLogin(identity: JwtIdentityDto): void {
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
      if (isService) AuthService.onServiceLogout.emit();
      else AuthService.onUserLogout.emit();
    } catch { /* ignore */ }
  }
}
