import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { map, Observable } from 'rxjs';
import { jwtDecode } from "jwt-decode";
import { AuthResponseModel } from '../models/auth-response-model';
import { AuthLoginModel } from '../models/auth-login-model';
import { EventService } from '../../services/event.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  eventService: EventService = inject(EventService);
  http: HttpClient = inject(HttpClient);
  tokenKey: string = "tokenkey";
  apiUrl: string = environment.apiUrl;

  login(loginModel : AuthLoginModel) : Observable<AuthResponseModel> {
    return this.http.post<AuthResponseModel>(`${this.apiUrl}/auth/login`, loginModel)
    .pipe(
      map((response: AuthResponseModel) => {
        if(response.result) {
          localStorage.setItem(this.tokenKey, response.token);
          this.eventService.onUserLogin.emit();
        }

        return response;
      })
    );
  }

  logout() : void {
    localStorage.removeItem(this.tokenKey);
    this.eventService.onUserLogout.emit();
  }

  register(registerModel : AuthLoginModel) : Observable<AuthResponseModel> {
    return this.http.post<AuthResponseModel>(`${this.apiUrl}/auth/register`, registerModel);
  }

  isLoggedIn() : boolean {
    const token = this.getToken();
    
    if (token == null) {
      return false;
    }

    return this.isTokenValid(token);
  }

  private getToken() : string | null {
    return localStorage.getItem(this.tokenKey) || null;
  }

  private isTokenValid(token: string) : boolean {
    if(token == null) {
      return false;
    }

    const decodedToken = jwtDecode(token);

    if (Date.now() > decodedToken["exp"]! * 1000) {
      this.logout();
      return false;
    }

    return true;
  }

  helloAuth(): Observable<string> {
    const token = this.getToken();
    if (!token) {
      throw new Error("User is not authenticated.");
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log("Calling HelloAuth endpoint with token:", token);

    return this.http.get(`${this.apiUrl}/hello/auth`, { headers, responseType: 'text' })
      .pipe(
        map(response => {
          console.log("Received HelloAuth response:", response);
          return response;
        })
      );
  }
}
