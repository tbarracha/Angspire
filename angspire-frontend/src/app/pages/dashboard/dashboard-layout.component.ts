import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrimarySidebarComponent } from './components/primary-sidebar.component';
import { SecondarySidebarComponent } from './components/secondary-sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    PrimarySidebarComponent,
    SecondarySidebarComponent
  ],
  template: `
    <div class="flex h-full w-full bg-background text-background-contrast">

      <!-- Primary Sidebar -->
      <app-primary-sidebar />

      <!-- Main Area -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- Top Navbar (main area only) -->
        <nav class="h-12 flex items-center justify-between px-4 bg-header text-header-contrast">
          <h1 class="text-lg font-semibold">Dashboard</h1>
          <div>
            <!-- Profile, Settings, Logout buttons -->
          </div>
        </nav>

        <div class="flex flex-1 overflow-hidden">
          <!-- Secondary Sidebar -->
          <app-secondary-sidebar />

          <!-- Routed Content -->
          <main class="flex-1 p-6 overflow-y-auto">
            <router-outlet />
          </main>
        </div>
      </div>

    </div>
  `
})
export class DashboardLayoutComponent {}
