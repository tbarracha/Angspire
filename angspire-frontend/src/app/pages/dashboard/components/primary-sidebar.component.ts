import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoLinkComponent } from '../../components/logo-link.component';

@Component({
  selector: 'app-primary-sidebar',
  standalone: true,
  imports: [CommonModule, LogoLinkComponent],
  template: `
    <aside class="h-full w-12 bg-nav-bar text-nav-bar-contrast flex flex-col justify-between
    transition-all duration-300 ease-in-out"
    [class]="isCollapsed ? 'w-12' : 'w-48'"
    >

      <!-- Top: Logo -->
      <div class="flex flex-col items-center h-12 p-2">
        <app-logo-link height="h-10" />
      </div>

      <!-- Middle: Scrollable Menu -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-4 px-2">
        <button class="w-10 h-10 rounded hover:bg-primary-contrast/10">🏠</button>
        <button class="w-10 h-10 rounded hover:bg-primary-contrast/10">📄</button>
        <button class="w-10 h-10 rounded hover:bg-primary-contrast/10">⚙️</button>
        <!-- Add more icons as needed -->
      </div>

      <!-- Bottom: User + Toggle -->
      <div class="flex flex-col items-center gap-2 p-2">
        <button class="w-10 h-10 rounded-full hover:bg-primary-contrast/10">👤</button>
        <button
          (click)="toggleCollapse()"
          class="w-full h-10 flex items-center justify-center hover:bg-primary-contrast/10"
        >
          {{ isCollapsed ? '➡️' : '⬅️' }}
        </button>
      </div>

    </aside>
  `
})
export class PrimarySidebarComponent {
  isCollapsed = false;

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }
}
