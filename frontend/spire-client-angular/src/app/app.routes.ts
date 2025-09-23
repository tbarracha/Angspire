import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './features/authentication/pages/auth-layout.component';
import { LoginPageComponent } from './features/authentication/pages/login-page.component';
import { RegisterPageComponent } from './features/authentication/pages/register-page.component';

import { HomePageComponent } from './features/home/home-page.component';
import { authRequiredCanMatch, redirectIfAuthenticatedCanMatch } from './spire-lib/modules/authentication/services/auth.guards';

export const routes: Routes = [
  /** 1) Default for authenticated users -> Home page */
  {
    path: '',
    pathMatch: 'full',
    canMatch: [authRequiredCanMatch],
    component: HomePageComponent,
  },

  /** 2) Default for guests -> Login (wrapped in Auth layout) */
  {
    path: '',
    pathMatch: 'full',
    component: AuthLayoutComponent,
    canMatch: [redirectIfAuthenticatedCanMatch],
    children: [{ path: '', component: LoginPageComponent }],
  },

  /** Public auth pages */
  {
    path: 'login',
    component: AuthLayoutComponent,
    canMatch: [redirectIfAuthenticatedCanMatch],
    children: [{ path: '', component: LoginPageComponent }],
  },
  {
    path: 'register',
    component: AuthLayoutComponent,
    canMatch: [redirectIfAuthenticatedCanMatch],
    children: [{ path: '', component: RegisterPageComponent }],
  },

  /** Fallback */
  { path: '**', redirectTo: '' },
];
