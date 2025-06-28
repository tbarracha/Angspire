import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar.component';
import { SidebarMenuItem } from '../../../shared/models/SidebarMenuItem';

type SidebarState = 'expanded' | 'collapsing' | 'collapsed';

@Component({
  selector: 'app-primary-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <app-sidebar
      [logoItem]="logoItem"
      [menuItems]="menuItems"
      [bottomMenuItems]="bottomMenuItems"
      [isCollapsed]="isCollapsed"
      variant="primary"
      [expandedWidth]="'12rem'"
      [collapsedWidth]="'3rem'"
    />
  `
})
export class PrimarySidebarComponent implements AfterViewInit {
  sidebarState: SidebarState = 'collapsed';
  isCollapsed = true;

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
      icon: '➡️',
      label: 'Collapse',
      action: () => this.toggleCollapse()
    },
    {
      icon: '👤',
      label: 'Profile',
      action: () => console.log('Open profile modal')
    },
    { icon: '⚙️', label: 'Settings', route: '/dashboard/settings' }
  ];

  ngAfterViewInit() {
    this.updateCollapseIcon();
  }

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
