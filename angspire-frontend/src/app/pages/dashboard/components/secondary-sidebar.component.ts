import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar.component';
import { SidebarMenuItem } from '../../models/SidebarMenuItem';

type SidebarState = 'expanded' | 'collapsing' | 'collapsed';

@Component({
  selector: 'app-secondary-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <app-sidebar
      [menuItems]="menuItems"
      [bottomMenuItems]="bottomMenuItems"
      [isCollapsed]="isCollapsed"
      [sidebarState]="sidebarState"
      variant="secondary"
      [logoLabelPosition]="'top'"
      [logoHeight]="'h-12'"
      [expandedWidth]="'13rem'"
      [collapsedWidth]="'3.25rem'"
    />
  `
})
export class SecondarySidebarComponent {
  sidebarState: SidebarState = 'expanded';
  isCollapsed = false;

  menuItems: SidebarMenuItem[] = [
    { icon: '📁', label: 'Projects', route: '/dashboard/projects' },
    { icon: '🗓️', label: 'Calendar', route: '/dashboard/calendar' },
    { icon: '🔔', label: 'Notifications', route: '/dashboard/notifications' }
  ];

  bottomMenuItems: SidebarMenuItem[] = [
  ];

  toggleCollapse() {
    if (this.isCollapsed) {
      this.sidebarState = 'expanded';
      this.isCollapsed = false;
    } else {
      this.sidebarState = 'collapsing';
      this.isCollapsed = true;
      setTimeout(() => {
        this.sidebarState = 'collapsed';
      }, 150);
    }
    this.updateCollapseIcon();
  }

  private updateCollapseIcon() {
    const collapseItem = this.bottomMenuItems.find(i => i.label === 'Collapse');
    if (collapseItem) {
      collapseItem.icon = this.isCollapsed ? '➡️' : '⬅️';
    }
  }
}
