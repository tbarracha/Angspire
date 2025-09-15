// state/dashboard-state.service.ts
import { Injectable, inject } from '@angular/core';
import { LocalStorageService } from '../../lib/modules/local-storage/localStorage.service';
import { StateService } from './state.service.base';

export type DashboardSection = 'home' | 'iam' | 'theme' | 'docs';

export interface DashboardState {
  isPrimarySidebarCollapsed: boolean;
  isSecondarySidebarCollapsed: boolean;
  currentSection: DashboardSection;
}

const DEFAULT_DASHBOARD_STATE: DashboardState = {
  isPrimarySidebarCollapsed: true,
  isSecondarySidebarCollapsed: false,
  currentSection: 'home',
};

@Injectable({ providedIn: 'root' })
export class DashboardStateService extends StateService<DashboardState> {
  constructor() {
    super(
      inject(LocalStorageService),
      'app.dashboard.state',
      DEFAULT_DASHBOARD_STATE
    );
  }

  togglePrimarySidebar(collapsed?: boolean) {
    const s = this.snapshot;
    this.patch({ isPrimarySidebarCollapsed: collapsed ?? !s.isPrimarySidebarCollapsed });
  }

  toggleSecondarySidebar(collapsed?: boolean) {
    const s = this.snapshot;
    this.patch({ isSecondarySidebarCollapsed: collapsed ?? !s.isSecondarySidebarCollapsed });
  }

  setSection(section: DashboardSection) {
    this.patch({ currentSection: section });
  }
}
