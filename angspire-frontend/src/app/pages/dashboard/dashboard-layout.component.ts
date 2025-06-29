import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PrimarySidebarComponent } from './components/primary-sidebar.component';
import { SecondarySidebarComponent } from './components/secondary-sidebar.component';
import { AppStateService } from '../../shared/app-state/app-state.service';
import { BreadcrumbComponent } from "../../shared/components/breadcrumb.component";

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    PrimarySidebarComponent,
    SecondarySidebarComponent,
    BreadcrumbComponent
],
  template: `
    <div class="flex h-full w-full bg-foreground">

      <!-- Primary Sidebar -->
      <app-primary-sidebar />

      <!-- Main Area -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- Top Navbar (main area only) -->
        <nav class="h-12 flex items-center justify-between px-4 bg-foreground text-foreground-text">
          <app-breadcrumb />
          <div>
            <!-- Profile, Settings, Logout buttons -->
          </div>
        </nav>

        <div class="flex flex-1 overflow-hidden rounded-tl-lg bg-background text-background-text">
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
export class DashboardLayoutComponent {
  private router = inject(Router);
  private appStateService = inject(AppStateService);

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateSection(event.urlAfterRedirects);
      }
    });
    // Initialize on first load
    this.updateSection(this.router.url);
  }

  private updateSection(url: string) {
    let section: 'home' | 'iam' | 'theme' | 'docs' = 'home';
    if (url.startsWith('/iam')) section = 'iam';
    else if (url.startsWith('/theme')) section = 'theme';
    else if (url.startsWith('/docs')) section = 'docs';

    this.appStateService.setCurrentSection(section);
  }
}
