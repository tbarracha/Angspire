import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarMenuItem } from '../../models/SidebarMenuItem';
import { SidebarMenuItemComponent } from './sidebar-menu-item.component';
import { LogoLinkComponent } from '../../../shared/components/logo-link.component';

export type SidebarVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, SidebarMenuItemComponent, LogoLinkComponent],
  template: `
    <aside
      class="h-full flex flex-col justify-between shadow-md"
      [style.width]="isCollapsed ? collapsedWidth : expandedWidth"
      [class]="
        variant === 'primary'
          ? 'bg-nav-bar text-nav-bar-contrast'
          : 'bg-secondary-nav-bar text-secondary-nav-bar-contrast'
      "
    >
      <!-- Top: Logo -->
      @if (logoItem) {
        <div
          class="flex flex-col h-12 p-2"
          [class.items-center]="isCollapsed"
          [class.items-start]="!isCollapsed"
        >
          <app-logo-link
            [src]="logoItem.imgSrc ?? ''"
            [label]="logoItem.label"
            [href]="logoItem.link ?? '#'"
            [isCollapsed]="isCollapsed"
            [labelPosition]="logoLabelPosition"
            [height]="logoHeight"
          />
        </div>
      }

      <!-- Middle: Menu Items -->
      <div
        class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col space-y-2 px-2"
        [class.items-center]="isCollapsed"
        [class.items-start]="!isCollapsed"
      >
        @for (item of menuItems; track item.route || item.label) {
          <app-sidebar-menu-item
            [item]="item"
            [isCollapsed]="isCollapsed"
          />
        }
      </div>

      <!-- Bottom: Optional Menu Items -->
      @if (bottomMenuItems.length) {
        <div
          class="flex flex-col gap-2 p-2 w-full"
          [class.items-center]="isCollapsed"
          [class.items-start]="!isCollapsed"
        >
          @for (item of bottomMenuItems; track item.label) {
            <app-sidebar-menu-item
              [item]="item"
              [isCollapsed]="isCollapsed"
            />
          }
        </div>
      }
    </aside>
  `
})
export class SidebarComponent {
  @Input() logoItem?: SidebarMenuItem;
  @Input() menuItems: SidebarMenuItem[] = [];
  @Input() bottomMenuItems: SidebarMenuItem[] = [];

  @Input() isCollapsed = false;
  @Input() variant: SidebarVariant = 'primary';

  @Input() logoLabelPosition: 'top' | 'right' | 'bottom' | 'left' = 'right';
  @Input() logoHeight: string = 'h-8';

  @Input() expandedWidth = '12rem';
  @Input() collapsedWidth = '3rem';
}
