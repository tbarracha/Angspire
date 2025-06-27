import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar.component';
import { SidebarMenuItem } from '../../models/SidebarMenuItem';
import { Router } from '@angular/router';
import { HOME_SIDEBAR_MENU } from '../pages/home/sidebar.config';
import { IAM_SIDEBAR_MENU } from '../pages/iam/sidebar.config';
import { THEME_SIDEBAR_MENU } from '../pages/theme/sidebar.config';
import { DOCS_SIDEBAR_MENU } from '../pages/docs/sidebar.config';

type SidebarState = 'expanded' | 'collapsing' | 'collapsed';

@Component({
  selector: 'app-secondary-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <app-sidebar
      [menuItems]="menuItems()"
      [bottomMenuItems]="bottomMenuItems"
      [isCollapsed]="isCollapsed"
      variant="secondary"
      [expandedWidth]="'13rem'"
      [collapsedWidth]="'3.25rem'"
    />
  `
})
export class SecondarySidebarComponent {
  sidebarState: SidebarState = 'expanded';
  isCollapsed = false;

  private router = inject(Router);

  readonly menuItems = computed((): SidebarMenuItem[] => {
    const url = this.router.url;
    
    if (url.startsWith('/iam')) return IAM_SIDEBAR_MENU;
    if (url.startsWith('/theme')) return THEME_SIDEBAR_MENU;
    if (url.startsWith('/docs')) return DOCS_SIDEBAR_MENU;
    return HOME_SIDEBAR_MENU;
  });

  bottomMenuItems: SidebarMenuItem[] = [];

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
