export interface SidebarMenuItem {
  icon?: string;               // Emoji or icon class
  imgSrc?: string;             // Optional image URL for icon
  label: string;               // Label text
  route?: string;              // Angular routerLink
  link?: string;               // External URL
  isCollapseToggle?: boolean;
  action?: () => void;         // Optional action
}
