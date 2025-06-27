import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { map, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { EventService } from '../../services/event.service';
import { LoginRequestDto } from '../../dtos/App/Authentication/Requests/login-request-dto';
import { RefreshTokenRequestDto } from '../../dtos/App/Authentication/Requests/refresh-token-request-dto';
import { RegisterRequestDto } from '../../dtos/App/Authentication/Requests/register-request-dto';
import { AuthResponseDto } from '../../dtos/App/Authentication/Responses/auth-response-dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private eventService = inject(EventService);
  private apiUrl = environment.apiUrl;
  private accessTokenKey = environment.authentication.tokenKey;
  private refreshTokenKey = environment.authentication.refreshTokenKey;

  login(dto: LoginRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/authentication/login`, dto).pipe(
      map((res) => {
        this.storeTokens(res);
        this.eventService.onUserLogin.emit();
        return res;
      })
    );
  }

  register(dto: RegisterRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/authentication/register`, dto).pipe(
      map((res) => {
        this.storeTokens(res);
        this.eventService.onUserLogin.emit();
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
    this.eventService.onUserLogout.emit();
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
