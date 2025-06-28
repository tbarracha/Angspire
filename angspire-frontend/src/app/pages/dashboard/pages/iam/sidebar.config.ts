import { SidebarMenuItem } from '../../../../shared/models/SidebarMenuItem';

export const IAM_SIDEBAR_MENU: SidebarMenuItem[] = [
  { icon: '🏠', label: 'Intro', route: '/iam' },
  { icon: '👥', label: 'Accounts', route: '/iam/accounts' },
  { icon: '👤', label: 'Groups', route: '/iam/groups' },
  { icon: '🔐', label: 'Roles', route: '/iam/roles' },
  { icon: '🛡️', label: 'Permissions', route: '/iam/permissions' }
];
