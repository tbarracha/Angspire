export type DashboardSection = 'home' | 'iam' | 'theme' | 'docs';

export interface DashboardState {
  isPrimarySidebarCollapsed: boolean;
  isSecondarySidebarCollapsed: boolean;
  currentSection: DashboardSection;
}

export interface AppState {
  dashboard: DashboardState;
}
