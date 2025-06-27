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
        class="flex items-center px-2 py-2 rounded hover:bg-primary-contrast/10 transition-all duration-150 w-full"
        [class.justify-center]="state === 'collapsed'"
        [class.justify-start]="state !== 'collapsed'"
        [class.gap-0]="state === 'collapsing'"
        [class.gap-2]="!collapsed"
      >
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </a>
    } @else {
      <button
        type="button"
        (click)="item.action?.()"
        class="flex items-center px-2 py-2 rounded hover:bg-primary-contrast/10 transition-all duration-150 w-full"
        [class.justify-center]="state === 'collapsed'"
        [class.justify-start]="state !== 'collapsed'"
        [class.gap-0]="state === 'collapsing'"
        [class.gap-2]="!collapsed"
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
        class="transition-all duration-150 ease-in-out overflow-hidden whitespace-nowrap"
        [class.opacity-0]="state !== 'expanded'"
        [class.w-0]="state !== 'expanded'"
        [class.opacity-100]="state === 'expanded'"
        [class.w-auto]="state === 'expanded'"
      >
        {{ item.label }}
      </span>
    </ng-template>
  `
})
export class SidebarMenuItemComponent {
  @Input() item!: SidebarMenuItem;
  @Input() collapsed = false;
  @Input() state: 'expanded' | 'collapsing' | 'collapsed' = 'expanded';
}
