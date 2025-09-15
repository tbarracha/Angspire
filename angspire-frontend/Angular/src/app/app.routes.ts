import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './features/authentication/pages/auth-layout.component';
import { LoginPageComponent } from './features/authentication/pages/login-page.component';
import { RegisterPageComponent } from './features/authentication/pages/register-page.component';
import {
  redirectIfAuthenticatedCanMatch,
  authRequiredCanMatch,
  authRequiredCanActivate
} from './modules/authentication/services/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: 'workspace', pathMatch: 'full' },
  { path: 'home', redirectTo: 'workspace', pathMatch: 'full' },

  // Public
  {
    path: 'login',
    component: AuthLayoutComponent,
    canMatch: [redirectIfAuthenticatedCanMatch],
    children: [{ path: '', component: LoginPageComponent }]
  },
  {
    path: 'register',
    component: AuthLayoutComponent,
    canMatch: [redirectIfAuthenticatedCanMatch],
    children: [{ path: '', component: RegisterPageComponent }]
  },

  // { path: '**', redirectTo: 'workspace' } // optional 404
];
