import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './features/authentication/pages/auth-layout.component';
import { LoginPageComponent } from './features/authentication/pages/login-page.component';
import { RegisterPageComponent } from './features/authentication/pages/register-page.component';
import {
  redirectIfAuthenticatedCanMatch,
  authRequiredCanMatch,
} from './modules/authentication/services/auth.guards';
import { HomePageComponent } from './features/home/home-page.component';

// Components gallery (public)
import { BrowseComponentsPage } from './features/browse-components/browse-components.page';
import { ButtonDemoPage } from './features/browse-components/demos/ui-primitives/button-demo.page';
import { SelectDemoPage } from './features/browse-components/demos/ui-primitives/select-demo.page';

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

  /** Public components gallery (no auth) */
  {
    path: 'components',
    component: BrowseComponentsPage,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'button' },
      { path: 'button', component: ButtonDemoPage },
      { path: 'select', component: SelectDemoPage },
    ],
  },

  /** Fallback */
  { path: '**', redirectTo: '' },
];
