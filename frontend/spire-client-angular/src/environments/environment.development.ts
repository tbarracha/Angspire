export type ApiProvider = 'aspDotNet' | 'nestJs';

/** Choose the backend you’re running locally */
const API_PROVIDER: ApiProvider = 'nestJs';

/** Map providers → base URLs */
const API_BASE_URLS = {
  aspDotNet: 'https://localhost:7094/api',
  nestJs: 'http://localhost:3000/api',
} as const;

/** Computed ONCE at build time so environment.apiUrl is a string */
const API_URL = API_BASE_URLS[API_PROVIDER];

export const environment = {
  production: false,

  apiProvider: API_PROVIDER,
  apiBaseUrls: API_BASE_URLS,

  /** Keep this as a string so callers can do `.replace(/\/+$/, '')` */
  apiUrl: API_URL,

  authentication: {
    tokenKey: 'auth_token',
    refreshTokenKey: 'auth_refresh_token',
    userKey: 'jwt_user',
  },

  enabledAuthGuard: true,
} as const;

/** Optional helper if some code prefers a function form */
export function apiUrl(): string {
  return environment.apiUrl;
}
