import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoLinkComponent } from '../../components/logo-link.component';
import { SidebarMenuItem } from '../../models/SidebarMenuItem';
import { SidebarMenuItemComponent } from './sidebar-menu-item.component';

enum SidebarState {
  Expanded = 'expanded',
  Collapsing = 'collapsing',
  Collapsed = 'collapsed'
}

@Component({
  selector: 'app-primary-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoLinkComponent,
    SidebarMenuItemComponent
  ],
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
      <div
        class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col space-y-2 px-2"
        [class.items-center]="isCollapsed"
        [class.items-start]="!isCollapsed"
      >
        @for (item of menuItems; track item.route) {
          <app-sidebar-menu-item
            [item]="item"
            [collapsed]="isCollapsed"
            [state]="sidebarState"
          />
        }
      </div>

      <!-- Bottom: Actions -->
      <div
        class="flex flex-col gap-2 p-2 w-full"
        [class.items-center]="isCollapsed"
        [class.items-start]="!isCollapsed"
      >
        @for (item of bottomMenuItems; track item.label) {
          <app-sidebar-menu-item
            [item]="item"
            [collapsed]="isCollapsed"
            [state]="sidebarState"
          />
        }
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

  bottomMenuItems: SidebarMenuItem[] = [
    {
      icon: '👤',
      label: 'Profile',
      action: () => {
        console.log('Open profile modal');
      }
    },
    {
      icon: '⬅️',
      label: 'Collapse',
      action: () => this.toggleCollapse()
    }
  ];

  toggleCollapse() {
    if (this.isCollapsed) {
      this.sidebarState = SidebarState.Expanded;
      this.isCollapsed = false;
      this.updateCollapseIcon();
    } else {
      this.sidebarState = SidebarState.Collapsing;
      this.isCollapsed = true;
      this.updateCollapseIcon();
      setTimeout(() => {
        this.sidebarState = SidebarState.Collapsed;
      }, 150);
    }
  }

  private updateCollapseIcon() {
    const collapseItem = this.bottomMenuItems.find(i => i.label === 'Collapse');
    if (collapseItem) {
      collapseItem.icon = this.isCollapsed ? '➡️' : '⬅️';
    }
  }
}
