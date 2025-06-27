import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PrimarySidebarComponent } from './components/primary-sidebar.component';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PrimarySidebarComponent],
  template: `
    <div class="flex h-full w-full bg-background text-background-contrast">

      <!-- Primary Sidebar -->
      <app-primary-sidebar />

      <!-- Secondary Sidebar -->
      <aside class="w-52 bg-secondary-nav-bar text-secondary-nav-bar-contrast p-4 space-y-2 overflow-y-auto shadow-md">
        <!-- Labeled nav items -->
        <a routerLink="/dashboard/home" class="block hover:underline">Home</a>
        <a routerLink="/dashboard/settings" class="block hover:underline">Settings</a>
      </aside>

      <!-- Main Area -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- Top Navbar (main area only) -->
        <nav class="h-12 flex items-center justify-between px-4 bg-header text-header-contrast shadow">
          <h1 class="text-lg font-semibold">Dashboard</h1>
          <div>
            <!-- Profile, Settings, Logout buttons -->
          </div>
        </nav>

        <!-- Routed Content -->
        <main class="flex-1 p-6 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>
  `
})
export class DashboardContainerComponent {}
