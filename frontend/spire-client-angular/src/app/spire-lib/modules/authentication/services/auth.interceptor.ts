// auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpContextToken,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LocalStorageService } from '../../local-storage/localStorage.service';

/** Other interceptors can read this to avoid refresh */
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);

function normalizeBase(u: string): string {
  // Lowercase, trim spaces, ensure trailing slash for base comparisons
  const s = (u || '').trim().toLowerCase();
  if (!s) return '';
  return s.endsWith('/') ? s : s + '/';
}

function tryParseUrl(raw: string): URL | null {
  try { return new URL(raw); } catch { return null; }
}

/**
 * Returns true when `url` is absolute and should NOT receive Authorization.
 * - Matches any base/origin in the merged whitelist (env + defaults).
 * - Base can be an origin ("https://domain.tld") or a longer base path.
 */
function isWhitelistedAbsolute(url: string, whitelist: string[]): boolean {
  const abs = tryParseUrl(url);
  if (!abs) return false; // relative URLs are never whitelisted here
  const target = abs.toString().toLowerCase();
  const targetWithSlash = normalizeBase(target);

  for (const item of whitelist) {
    const base = normalizeBase(item);
    if (!base) continue;

    // If whitelist item is an origin, normalize to origin/
    const asUrl = tryParseUrl(base);
    if (!asUrl) continue;

    const baseOrigin = normalizeBase(asUrl.origin);
    // Case A: exact origin only (no path specified in whitelist)
    const originOnly = base === baseOrigin;

    if (originOnly) {
      // Any path under this origin is whitelisted
      if (target.startsWith(asUrl.origin.toLowerCase())) return true;
    } else {
      // Case B: base path specified – require startsWith on the full base
      if (targetWithSlash.startsWith(base)) return true;
    }
  }
  return false;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly storage = inject(LocalStorageService);

  private readonly tokenKey = environment.authentication.tokenKey;
  private readonly apiBase = environment.apiUrl ?? '';
  private lastSeenToken: string | null = null;
  private readonly tokenSetAtKey = `${this.tokenKey}.setAt`;
  private readonly freshLoginMs = 5000;

  // --- Built-in whitelist + environment-provided entries
  private readonly defaultWhitelist: string[] = [
    'https://openrouter.ai/api/v1',
  ];
  private readonly envWhitelist: string[] =
    environment.authentication?.authHeaderWhitelist ??
    (environment as any).authHeaderWhitelist ??
    [];

  private get whitelist(): string[] {
    // Merge + de-dup (case-insensitive)
    const merged = [...this.defaultWhitelist, ...this.envWhitelist]
      .map(normalizeBase)
      .filter(Boolean);
    return Array.from(new Set(merged));
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = request.url;
    const isAbsolute = /^https?:\/\//i.test(url);
    const whitelist = this.whitelist;

    // 0) Whitelisted absolutes: never attach JWT
    if (isAbsolute && isWhitelistedAbsolute(url, whitelist)) {
      this.logHeaders(request, '[WHITELIST]');
      return next.handle(request).pipe(tap({ next: () => {}, error: () => {} }));
    }

    // 1) Non-our API (absolute to a different base): pass-through (no Authorization)
    const isOurApi = !isAbsolute || (this.apiBase && url.startsWith(this.apiBase));
    if (!isOurApi) {
      this.logHeaders(request, '[3P]');
      return next.handle(request).pipe(tap({ next: () => {}, error: () => {} }));
    }

    // 2) Public auth endpoints: don't attach Authorization, mark skip refresh
    const isAuthEndpoint = this.matchesAny(url, [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/logout',
    ]);
    if (isAuthEndpoint) {
      const req = request.clone({
        context: request.context.set(SKIP_REFRESH, true),
      });
      this.logHeaders(req, '[API/Auth]');
      return next.handle(req).pipe(tap({ next: () => {}, error: () => {} }));
    }

    // 3) Attach Authorization if we have a token
    const token = this.storage.get<string>(this.tokenKey);
    if (token && token !== this.lastSeenToken) {
      this.lastSeenToken = token;
      try { this.storage.set(this.tokenSetAtKey, `${Date.now()}`); } catch {}
    }

    let outgoing = request;
    if (token) {
      outgoing = outgoing.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    // 4) Fresh-login window: mark to skip refresh logic
    const setAtRaw = this.storage.get<string>(this.tokenSetAtKey);
    const setAt = parseInt(setAtRaw ?? '0', 10);
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
    return fragments.some(f => url.includes(f));
  }

  private logHeaders(request: HttpRequest<any>, prefix: string) {
    const headersObj: Record<string, string[] | null> = {};
    request.headers.keys().forEach(k => {
      headersObj[k] = request.headers.getAll(k);
    });
    console.log(
      `${prefix} ${request.method} ${request.url}`,
      '\nHeaders:',
      headersObj,
      '\nWhitelist:',
      this.whitelist
    );
  }
}
