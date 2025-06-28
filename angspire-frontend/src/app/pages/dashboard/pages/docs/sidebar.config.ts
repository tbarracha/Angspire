import { SidebarMenuItem } from '../../../../shared/models/SidebarMenuItem';

export const DOCS_SIDEBAR_MENU: SidebarMenuItem[] = [
  { icon: '📚', label: 'Intro', route: '/docs' },
  { icon: '📝', label: 'All Docs', route: '/docs/all' },
  { icon: '➕', label: 'Create New', route: '/docs/create' },
  { icon: '🔄', label: 'Updates', route: '/docs/updates' }
];
