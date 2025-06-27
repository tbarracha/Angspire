import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoLinkComponent } from '../../components/logo-link.component';
import { SidebarMenuItem } from '../../models/SidebarMenuItem';

enum SidebarState {
  Expanded = 'expanded',
  Collapsing = 'collapsing',
  Collapsed = 'collapsed'
}

@Component({
  selector: 'app-primary-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoLinkComponent],
  template: `
    <aside
      class="h-full bg-nav-bar text-nav-bar-contrast flex flex-col justify-between transition-all duration-150 ease-in-out"
      [class.w-12]="isCollapsed"
      [class.w-48]="!isCollapsed"
    >
      <!-- Top: Logo -->
      <div class="flex flex-col h-12 p-2">
        <app-logo-link
          height="h-10"
          [collapsed]="isCollapsed"
          [labelPosition]="'left'"
          [justifyPosition]="'justify-left'"
          [gap]="'gap-4'"
          [label]="'Angspire'"
        />
      </div>

      <!-- Middle: Scrollable Menu -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col space-y-2 px-2">
        @for (item of menuItems; track item.route) {
          <a
            [routerLink]="item.route"
            class="flex items-center gap-2 px-2 py-2 rounded hover:bg-primary-contrast/10 transition-all duration-150"
            [class.justify-center]="sidebarState === 'collapsed'"
            [class.justify-start]="sidebarState !== 'collapsed'"
          >
            <span class="text-xl flex-shrink-0">{{ item.icon }}</span>

            <span
              class="transition-opacity duration-150 ease-in-out overflow-hidden"
              [class.opacity-0]="sidebarState !== 'expanded'"
              [class.opacity-100]="sidebarState === 'expanded'"
              *ngIf="sidebarState !== 'collapsed'"
            >
              {{ item.label }}
            </span>
          </a>
        }
      </div>

      <!-- Bottom: User + Toggle -->
      <div class="flex flex-col items-center gap-2 p-2 w-full">
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
  SidebarState = SidebarState;
  sidebarState: SidebarState = SidebarState.Expanded;
  isCollapsed = false;

  menuItems: SidebarMenuItem[] = [
    { icon: '🏠', label: 'Home', route: '/dashboard/home' },
    { icon: '📄', label: 'Docs', route: '/dashboard/docs' },
    { icon: '⚙️', label: 'Settings', route: '/dashboard/settings' }
  ];

  toggleCollapse() {
    if (this.isCollapsed) {
      this.sidebarState = SidebarState.Expanded;
      this.isCollapsed = false;
    } else {
      this.sidebarState = SidebarState.Collapsing;
      this.isCollapsed = true;
      setTimeout(() => {
        this.sidebarState = SidebarState.Collapsed;
      }, 150);
    }
  }
}
