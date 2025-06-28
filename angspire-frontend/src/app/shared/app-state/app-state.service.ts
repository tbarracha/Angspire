import { Injectable, signal } from '@angular/core';
import { AppState, DashboardSection } from './app-state-interfaces';

// Optional: for clean resets in future (testing, logout, etc.)
export const DEFAULT_APP_STATE: AppState = {
  dashboard: {
    isPrimarySidebarCollapsed: true,
    isSecondarySidebarCollapsed: false,
    currentSection: 'home'
  }
};

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private appState = signal<AppState>({ ...DEFAULT_APP_STATE });

  get state() {
    return this.appState.asReadonly();
  }

  setPrimarySidebarCollapsed(collapsed: boolean) {
    this.appState.update((state) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        isPrimarySidebarCollapsed: collapsed
      }
    }));
  }

  togglePrimarySidebar() {
    this.setPrimarySidebarCollapsed(!this.appState().dashboard.isPrimarySidebarCollapsed);
  }

  setSecondarySidebarCollapsed(collapsed: boolean) {
    this.appState.update((state) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        isSecondarySidebarCollapsed: collapsed
      }
    }));
  }

  toggleSecondarySidebar() {
    this.setSecondarySidebarCollapsed(!this.appState().dashboard.isSecondarySidebarCollapsed);
  }

  setCurrentSection(section: DashboardSection) {
    this.appState.update((state) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        currentSection: section
      }
    }));
  }

  resetState() {
    this.appState.set({ ...DEFAULT_APP_STATE });
  }
}
