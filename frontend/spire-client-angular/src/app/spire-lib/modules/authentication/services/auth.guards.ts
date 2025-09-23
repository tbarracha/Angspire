// app/auth.guards.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlSegment } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../../../environments/environment';

export const authRequiredCanActivate: CanActivateFn = (route, state) => {
  if (!environment.enabledAuthGuard) return true;
  
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const authRequiredCanMatch: CanMatchFn = (route, segments: UrlSegment[]) => {
  if (!environment.enabledAuthGuard) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  const target = '/' + segments.map(s => s.path).join('/');
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: target } });
};

export const redirectIfAuthenticatedCanMatch: CanMatchFn = () => {
  if (!environment.enabledAuthGuard) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/workspace']) : true;
};
