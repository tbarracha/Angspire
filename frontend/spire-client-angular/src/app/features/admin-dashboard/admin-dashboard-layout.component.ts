// admin-dashboard-layout.component.ts
import { Component, inject, signal, effect } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminTab, AdminTabBarComponent } from './components/admin-tab-bar.component';

@Component({
  selector: 'app-admin-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminTabBarComponent],
  template: `
  <div class="flex h-full w-full bg-background">
    <!-- Main Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Tab Bar -->
      <app-admin-tab-bar
        [tabs]="tabs()"
        class="border-b border-divider bg-foreground">
      </app-admin-tab-bar>

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
  //private readonly appState = inject(AppStateService);

  // Configure tabs here (add/remove freely)
  readonly tabs = signal<AdminTab[]>([
    { path: '/admin/providers', label: 'Providers' },
    { path: '/admin/tags',   label: 'Tags' },
    { path: '/admin/users',  label: 'Users' },
  ]);

  constructor() {
    // reflect section in app state (like your dashboard)
    effect(() => {
      //this.appState.setDashboardSection('iam'); // or 'admin' if you add it to your enum
    });

    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        // could add analytics/breadcrumb sync here if needed
      }
    });
  }
}
