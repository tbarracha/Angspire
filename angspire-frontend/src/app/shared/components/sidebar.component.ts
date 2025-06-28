import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarMenuItem } from '../models/SidebarMenuItem';
import { SidebarMenuItemComponent } from './sidebar-menu-item.component';
import { LogoLinkComponent } from './logo-link.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, SidebarMenuItemComponent, LogoLinkComponent],
  template: `
    <aside
      class="h-full flex flex-col justify-between shadow-md"
      [style.width]="isCollapsed ? collapsedWidth : expandedWidth"
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
        class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-2 p-2"
        [class.items-center]="isCollapsed"
        [class.items-start]="!isCollapsed"
      >
        @for (item of menuItems; track item.route || item.label) {
          <div class="w-full">
            <app-sidebar-menu-item
              [item]="item"
              [isCollapsed]="isCollapsed"
              (click)="onMenuItemClick(item)"
            />
          </div>
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
          <div class="w-full">
            <app-sidebar-menu-item
              [item]="item"
              [isCollapsed]="isCollapsed"
            />
          </div>
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

  @Output() collapsedChange = new EventEmitter<boolean>();

  @Input() logoLabelPosition: 'top' | 'right' | 'bottom' | 'left' = 'right';
  @Input() logoHeight: string = 'h-8';

  @Input() expandedWidth = '12rem';
  @Input() collapsedWidth = '3rem';

  onMenuItemClick(item: SidebarMenuItem) {
    if (item.isCollapseToggle) {
      this.toggleCollapsed();
    }
  }

  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }
}
