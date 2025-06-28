import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './pages/auth/auth-layout.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { DashboardLayoutComponent } from './pages/dashboard/dashboard-layout.component';
import { HomePageComponent } from './pages/dashboard/pages/home/home-page.component';
import { IamHomePageComponent } from './pages/dashboard/pages/iam/iam-home-page.component';
import { ThemeHomePageComponent } from './pages/dashboard/pages/theme/theme-home-page.component';
import { DocsHomePageComponent } from './pages/dashboard/pages/docs/docs-home-page.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginPageComponent },
      { path: 'register', component: RegisterPageComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'home',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: HomePageComponent }
    ]
  },
  {
    path: 'iam',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: IamHomePageComponent }
    ]
  },
  {
    path: 'theme',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: ThemeHomePageComponent }
    ]
  },
  {
    path: 'docs',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: DocsHomePageComponent }
    ]
  }
];
