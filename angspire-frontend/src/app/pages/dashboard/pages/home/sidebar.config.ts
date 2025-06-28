import { SidebarMenuItem } from '../../../../shared/models/SidebarMenuItem';

export const HOME_SIDEBAR_MENU: SidebarMenuItem[] = [
  { icon: '🏠', label: 'Home', route: '/home' },
  { icon: '📁', label: 'Projects', route: '/home/projects' },
  { icon: '🗓️', label: 'Calendar', route: '/home/calendar' },
  { icon: '🔔', label: 'Notifications', route: '/home/notifications' }
];
