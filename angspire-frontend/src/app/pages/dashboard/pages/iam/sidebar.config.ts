import { SidebarMenuItem } from '../../../models/SidebarMenuItem';

export const IAM_SIDEBAR_MENU: SidebarMenuItem[] = [
  { icon: '🏠', label: 'IAM Home', route: '/iam' },
  { icon: '👥', label: 'Users', route: '/iam/users' },
  { icon: '👤', label: 'Groups', route: '/iam/groups' },
  { icon: '🔐', label: 'Roles', route: '/iam/roles' },
  { icon: '🛡️', label: 'Permissions', route: '/iam/permissions' }
];
