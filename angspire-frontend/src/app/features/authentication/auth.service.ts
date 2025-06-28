import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EventEmitter, inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { LoginRequestDto } from './dtos/requests/login-request-dto';
import { RefreshTokenRequestDto } from './dtos/requests/refresh-token-request-dto';
import { RegisterRequestDto } from './dtos/requests/register-request-dto';
import { AuthResponseDto } from './dtos/responses/auth-response-dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private accessTokenKey = environment.authentication.tokenKey;
  private refreshTokenKey = environment.authentication.refreshTokenKey;

  static readonly onUserLogin = new EventEmitter<void>();
  static readonly onUserLogout = new EventEmitter<void>();

  login(dto: LoginRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/authentication/login`, dto).pipe(
      map((res) => {
        this.storeTokens(res);
        AuthService.onUserLogin.emit();
        return res;
      })
    );
  }

  register(dto: RegisterRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/authentication/register`, dto).pipe(
      map((res) => {
        this.storeTokens(res);
        AuthService.onUserLogin.emit();
        return res;
      })
    );
  }

  refreshToken(): Observable<AuthResponseDto> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) throw new Error("No refresh token available");

    return this.http.post<AuthResponseDto>(`${this.apiUrl}/authentication/refresh`, {
      refreshToken
    } as RefreshTokenRequestDto).pipe(
      map((res) => {
        this.storeTokens(res);
        return res;
      })
    );
  }

  getCurrentUser(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.getAccessToken()}`
    });

    return this.http.get(`${this.apiUrl}/authentication/me`, { headers });
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    AuthService.onUserLogout.emit();
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return token != null && this.isTokenValid(token);
  }

  private storeTokens(response: AuthResponseDto): void {
    localStorage.setItem(this.accessTokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
  }

  private getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  private isTokenValid(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const isExpired = Date.now() > decoded.exp * 1000;
      if (isExpired) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}
