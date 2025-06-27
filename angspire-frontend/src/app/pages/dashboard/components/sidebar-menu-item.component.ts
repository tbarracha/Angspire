import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarMenuItem } from '../../models/SidebarMenuItem';

@Component({
  selector: 'app-sidebar-menu-item',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (item.route) {
      <a
        [routerLink]="item.route"
        class="flex items-center px-2 py-2 rounded hover:bg-primary-contrast/10 w-full"
        [class.justify-center]="isCollapsed"
        [class.justify-start]="!isCollapsed"
        [class.gap-2]="!isCollapsed"
      >
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </a>
    } @else {
      <button
        type="button"
        (click)="item.action?.()"
        class="flex items-center px-2 py-2 rounded hover:bg-primary-contrast/10 w-full"
        [class.justify-center]="isCollapsed"
        [class.justify-start]="!isCollapsed"
        [class.gap-2]="!isCollapsed"
      >
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </button>
    }

    <ng-template #content>
      @if (item.imgSrc) {
        <img [src]="item.imgSrc" class="w-6 h-6 object-contain" />
      } @else if (item.icon) {
        <span class="text-xl flex-shrink-0">{{ item.icon }}</span>
      }

      <span
        class="overflow-hidden whitespace-nowrap"
        [class.hidden]="isCollapsed"
      >
        {{ item.label }}
      </span>
    </ng-template>
  `
})
export class SidebarMenuItemComponent {
  @Input() item!: SidebarMenuItem;
  @Input() isCollapsed = false;
}
