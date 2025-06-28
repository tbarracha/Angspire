import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './pages/auth/auth-layout.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { DashboardLayoutComponent } from './pages/dashboard/dashboard-layout.component';
import { HomePageComponent } from './pages/dashboard/pages/home/home-page.component';
import { IamHomePageComponent } from './pages/dashboard/pages/iam/iam-home-page.component';
import { ThemeHomePageComponent } from './pages/dashboard/pages/theme/theme-home-page.component';
import { DocsHomePageComponent } from './pages/dashboard/pages/docs/docs-home-page.component';
import { BubblePopperPageComponent } from './pages/dashboard/pages/home/bubble-popper-page/bubble-popper-page.component';
import { TodoListPageComponent } from './pages/dashboard/pages/home/todo-list-page/todo-list-page.component';

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
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: 'home', component: HomePageComponent },
      { path: 'home/todo', component: TodoListPageComponent },
      { path: 'home/bubble-pop', component: BubblePopperPageComponent },
      { path: 'iam', component: IamHomePageComponent },
      { path: 'theme', component: ThemeHomePageComponent },
      { path: 'docs', component: DocsHomePageComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  }
];
