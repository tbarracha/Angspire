import { Routes } from '@angular/router';

import { authRequiredCanMatch, redirectIfAuthenticatedCanMatch } from './spire-lib/modules/authentication/services/auth.guards';

import { AuthLayoutComponent } from './features/authentication/pages/auth-layout.component';
import { LoginPageComponent } from './features/authentication/pages/login-page.component';
import { RegisterPageComponent } from './features/authentication/pages/register-page.component';

import { AdminDashboardLayoutComponent } from './features/admin-dashboard/admin-dashboard-layout.component';
import { UsersAdminPageComponent } from './features/admin-dashboard/components/users-admin-page.component';
import { TagsAdminPageComponent } from './features/admin-dashboard/components/tags-admin-page.component';

// Admin pages (standalone)

export const routes: Routes = [
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

  /** Admin section (protected) */
  {
    path: 'admin',
    canMatch: [authRequiredCanMatch],
    component: AdminDashboardLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' }, // default tab
      { path: 'users', component: UsersAdminPageComponent },
      // { path: 'groups', component: GroupsAdminPageComponent }, // uncomment when ready
      { path: 'tags', component: TagsAdminPageComponent },
    ],
  },

  /** Root: send authenticated users to /admin, guests to /login */
  { path: '', pathMatch: 'full', redirectTo: 'admin' },

  /** Fallback */
  { path: '**', redirectTo: 'admin' },
];
