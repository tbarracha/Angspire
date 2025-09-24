// src/app/shared/components/breadcrumb.component.ts
import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

interface Breadcrumb {
  segment: string; // raw path segment (may be a GUID)
  label: string;   // preformatted label for non-GUIDs (fallback)
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="flex text-sm items-center gap-3 font-semibold" aria-label="Breadcrumb">
      @for (crumb of breadcrumbs(); let last = $last; track crumb.url) {
        @if (!last) {
          <a [routerLink]="crumb.url" [ngClass]="linkClass()">
            {{ crumb.label }}
          </a>
          <span class="mx-2 select-none">{{ divider() }}</span>
        } @else {
          <span [ngClass]="currentClass()">
            {{ crumb.label }}
          </span>
        }
      } @empty {
        <span class="opacity-60">Home</span>
      }
    </nav>
  `,
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);

  // Inputs for customization
  readonly divider = input<string>('/');
  readonly linkClass = input<string>('hover:text-accent transition-colors');
  readonly currentClass = input<string>('text-dark cursor-default');

  private readonly url = signal<string>(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.url.set(this.router.url));
  }

  readonly breadcrumbs = computed<Breadcrumb[]>(() => this.createBreadcrumbs(this.url()));

  private createBreadcrumbs(url: string): Breadcrumb[] {
    const path = url.split('?')[0].split('#')[0];
    const segments = path.split('/').filter(Boolean);

    let builtUrl = '';
    const crumbs: Breadcrumb[] = [];
    for (const seg of segments) {
      builtUrl += `/${seg}`;
      crumbs.push({
        segment: seg,
        label: this.formatLabel(seg),
        url: builtUrl,
      });
    }
    return crumbs;
  }

  private formatLabel(segment: string): string {
    const map: Record<string, string> = { iam: 'IAM', chat: 'Chat', admin: 'Admin' };
    if (segment in map) return map[segment];
    return segment
      .split('-')
      .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
}
