import { Component, AfterViewInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar.component';
import { SidebarMenuItem } from '../../../shared/models/SidebarMenuItem';
import { AppStateService } from '../../../shared/app-state/app-state.service';

@Component({
  selector: 'app-primary-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="h-full bg-navbar-primary text-navbar-primary-contrast">
      <app-sidebar
        [logoItem]="logoItem"
        [menuItems]="menuItems"
        [bottomMenuItems]="bottomMenuItems"
        [isCollapsed]="isCollapsed"
        variant="primary"
        [expandedWidth]="'10rem'"
        [collapsedWidth]="'3.5rem'"
      />
    </div>
  `
})
export class PrimarySidebarComponent implements AfterViewInit {
  private appStateService = inject(AppStateService);

  // Use state service for collapse
  get isCollapsed() {
    return this.appStateService.state().dashboard.isPrimarySidebarCollapsed;
  }
  set isCollapsed(value: boolean) {
    this.appStateService.setPrimarySidebarCollapsed(value);
  }

  logoItem: SidebarMenuItem = {
    imgSrc: '/angspire_icon_neg.png',
    label: 'Angspire',
    link: 'https://github.com/tbarracha/Angspire'
  };

  menuItems: SidebarMenuItem[] = [
    { icon: '🏠', label: 'Home', route: '/home' },
    { icon: '👥', label: 'IAM', route: '/iam' },
    { icon: '🎨', label: 'Theme', route: '/theme' },
    { icon: '📄', label: 'Docs', route: '/docs' }
  ];

  bottomMenuItems: SidebarMenuItem[] = [
    {
      icon: '👤',
      label: 'Profile',
      action: () => console.log('Open profile modal')
    },
    { icon: '⚙️', label: 'Settings', route: '/dashboard/settings' },
    {
      icon: '➡️',
      label: 'Collapse',
      isCollapseToggle: true,
      action: () => this.toggleCollapse()
    }
  ];

  ngAfterViewInit() {
    this.updateCollapseIcon();
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.updateCollapseIcon();
  }

  private updateCollapseIcon() {
    for (const item of this.bottomMenuItems) {
      if (item.isCollapseToggle) {
        item.icon = this.isCollapsed ? '➡️' : '⬅️';
      }
    }
  }
}
