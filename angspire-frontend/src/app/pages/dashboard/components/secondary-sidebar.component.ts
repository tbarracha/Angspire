import { Component, computed, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar.component';
import { SidebarMenuItem } from '../../../shared/models/SidebarMenuItem';
import { AppStateService } from '../../../shared/app-state/app-state.service';
import { HOME_SIDEBAR_MENU } from '../pages/home/sidebar.config';
import { IAM_SIDEBAR_MENU } from '../pages/iam/sidebar.config';
import { THEME_SIDEBAR_MENU } from '../pages/theme/sidebar.config';
import { DOCS_SIDEBAR_MENU } from '../pages/docs/sidebar.config';

@Component({
  selector: 'app-secondary-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="h-full bg-navbar-secondary text-navbar-secondary-contrast">
      <app-sidebar
        [menuItems]="menuItems()"
        [bottomMenuItems]="bottomMenuItems"
        [isCollapsed]="isCollapsed"
        variant="secondary"
        [expandedWidth]="'13rem'"
        [collapsedWidth]="'3.5rem'"
      />
    </div>
  `
})
export class SecondarySidebarComponent implements AfterViewInit {
  private appStateService = inject(AppStateService);

  get isCollapsed() {
    return this.appStateService.state().dashboard.isSecondarySidebarCollapsed;
  }
  set isCollapsed(value: boolean) {
    this.appStateService.setSecondarySidebarCollapsed(value);
  }

  readonly menuItems = computed((): SidebarMenuItem[] => {
    switch (this.appStateService.state().dashboard.currentSection) {
      case 'iam':   return IAM_SIDEBAR_MENU;
      case 'theme': return THEME_SIDEBAR_MENU;
      case 'docs':  return DOCS_SIDEBAR_MENU;
      default:      return HOME_SIDEBAR_MENU;
    }
  });

  bottomMenuItems: SidebarMenuItem[] = [
    {
      icon: '⬅️',
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
    const collapseItem = this.bottomMenuItems.find(i => i.label === 'Collapse');
    if (collapseItem) {
      collapseItem.icon = this.isCollapsed ? '➡️' : '⬅️';
    }
  }
}
