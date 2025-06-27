export interface SidebarMenuItem {
  icon?: string;              // Emoji or icon class
  imgSrc?: string;            // Optional image URL for icon
  label: string;              // Label text
  route?: string;             // Route for routerLink navigation
  action?: () => void;        // Optional action when clicked
}
