// components/admin-tab-bar.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type AdminTab = { path: string; label: string; };

@Component({
  selector: 'app-admin-tab-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
  <nav class="w-full px-6">
    <ul class="flex gap-2">
      @for (t of tabs; track t.path) {
        <li>
          <a
            [routerLink]="t.path"
            routerLinkActive="is-active"
            class="inline-flex items-center h-10 px-4 rounded-t-md
                   text-sm font-medium text-tertiary hover:text-primary/90
                   border border-transparent border-b-0
                   hover:bg-foreground/60"
            [class.border-divider]="false">
            {{ t.label }}
          </a>
        </li>
      }
    </ul>
  </nav>
  `,
  styles: [`
    .is-active {
      @apply text-primary bg-foreground border-x border-t border-divider;
    }
  `]
})
export class AdminTabBarComponent {
  @Input({ required: true }) tabs: AdminTab[] = [];
}
