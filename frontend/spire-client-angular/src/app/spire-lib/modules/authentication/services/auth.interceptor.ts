// auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpContextToken,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/** Other interceptors (e.g., a RefreshInterceptor) can read this to avoid refresh */
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenKey = environment.authentication.tokenKey;
  private readonly openRouterBase = 'https://openrouter.ai/api/v1'; // openrouter
  private readonly apiBase = environment.apiUrl ?? ''; // ensure this exists in your envs
  private lastSeenToken: string | null = null;
  private readonly tokenSetAtKey = `${this.tokenKey}.setAt`;
  private readonly freshLoginMs = 5000; // window to avoid immediate refreshes

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = request.url;

    // 0) OpenRouter calls: never attach our JWT.
    if (url.startsWith(this.openRouterBase)) {
      this.logHeaders(request, '[OpenRouter]');
      return next.handle(request).pipe(tap({ next: () => {}, error: () => {} }));
    }

    const isAbsolute = /^https?:\/\//i.test(url);
    const isOurApi = !isAbsolute || (this.apiBase && url.startsWith(this.apiBase));

    // Public auth endpoints: let them pass, and mark to skip refresh handling.
    const isAuthEndpoint = this.matchesAny(url, [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/logout',
    ]);

    if (!isOurApi) {
      // Third-party non-OpenRouter: pass through untouched.
      this.logHeaders(request, '[3P]');
      return next.handle(request).pipe(tap({ next: () => {}, error: () => {} }));
    }

    // 1) Fetch token (if any) and auto-stamp "setAt" when the token changes.
    const token = localStorage.getItem(this.tokenKey);
    if (token && token !== this.lastSeenToken) {
      this.lastSeenToken = token;
      try {
        localStorage.setItem(this.tokenSetAtKey, `${Date.now()}`);
      } catch {}
    }

    // 2) If this is an auth endpoint, don't add Authorization and tell downstream to skip refresh.
    if (isAuthEndpoint) {
      const req = request.clone({
        context: request.context.set(SKIP_REFRESH, true),
      });
      this.logHeaders(req, '[API/Auth]');
      return next.handle(req).pipe(tap({ next: () => {}, error: () => {} }));
    }

    // 3) For all other API calls, attach Authorization if we have a token.
    let outgoing = request;
    if (token) {
      outgoing = outgoing.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    // 4) Fresh-login window: if token was just set, mark this request to skip refresh logic.
    const setAt = parseInt(localStorage.getItem(this.tokenSetAtKey) ?? '0', 10);
    const isFresh = !!setAt && Date.now() - setAt < this.freshLoginMs;
    if (isFresh) {
      outgoing = outgoing.clone({
        context: outgoing.context.set(SKIP_REFRESH, true),
      });
    }

    this.logHeaders(outgoing, '[API]');
    return next.handle(outgoing).pipe(tap({ next: () => {}, error: () => {} }));
  }

  private matchesAny(url: string, fragments: string[]): boolean {
    // Works for absolute (https://api/...) and relative (/auth/login) URLs
    return fragments.some(f => url.includes(f));
  }

  private logHeaders(request: HttpRequest<any>, prefix: string) {
    const headersObj: Record<string, string[] | null> = {};
    request.headers.keys().forEach(k => {
      headersObj[k] = request.headers.getAll(k);
    });
    console.log(`${prefix} ${request.method} ${request.url}`, '\nHeaders:', headersObj);
  }
}
