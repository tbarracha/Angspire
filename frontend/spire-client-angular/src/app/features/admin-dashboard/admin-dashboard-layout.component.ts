// admin-dashboard-layout.component.ts
import { Component, inject, signal, effect } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminTab, AdminTabBarComponent } from './components/admin-tab-bar.component';
import { AppStateService } from '../../app-state/app-state.service';
import { BreadcrumbComponent } from '../../spire-lib/ui-kit/breadcrumb.component';

@Component({
  selector: 'app-admin-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminTabBarComponent, BreadcrumbComponent],
  template: `
  <div class="flex h-full w-full bg-base-100 text-base-content">
    <!-- Main Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header: Breadcrumb (top-left) then Admin Tabs -->
      <header class="flex flex-row border-b border-base-300 bg-base-300">
          <!-- Breadcrumb -->
          <div class="flex items-center justify-center">
            <app-breadcrumb 
              divider="›" 
              linkClass="text-accent/60 hover:underline" 
              currentClass="text-base-content font-bold"
            />
          </div>

          <!-- Admin Tabs -->
          <div class="flex-1">
            <app-admin-tab-bar
              [tabs]="tabs()"
              class="bg-base-200 rounded-xl overflow-x-auto">
            </app-admin-tab-bar>
          </div>
      </header>

      <!-- Routed Content -->
      <main class="flex-1 overflow-auto bg-foreground">
        <router-outlet />
      </main>
    </div>
  </div>
  `
})
export class AdminDashboardLayoutComponent {
  private readonly router = inject(Router);
  private readonly appState = inject(AppStateService);

  // Configure tabs here (add/remove freely)
  readonly tabs = signal<AdminTab[]>([
    { path: '/admin/users',  label: 'Users' },
    { path: '/admin/groups', label: 'Groups' },
    { path: '/admin/tags',   label: 'Tags' },
  ]);

  constructor() {
    effect(() => { /* reflect section in app state if needed */ });

    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        // analytics/breadcrumb sync point if needed
      }
    });
  }
}
