// src/app/shared/components/breadcrumb.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SessionTitlePipe } from '../../../modules/sessions/services/session-title.pipe';

interface Breadcrumb {
  segment: string; // raw path segment (may be a GUID)
  label: string;   // preformatted label for non-GUIDs (fallback)
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, SessionTitlePipe],
  template: `
    <nav class="flex text-sm items-center gap-3 text-tertiary/60 font-semibold" aria-label="Breadcrumb">
      <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
        <ng-container *ngIf="!last; else lastBreadcrumb">
          <a [routerLink]="crumb.url" class="hover:text-accent transition-colors">
            {{ crumb.segment | sessionTitle: crumb.label }}
          </a>
          <span class="mx-2 select-none">/</span>
        </ng-container>
        <ng-template #lastBreadcrumb>
          <span class="text-dark cursor-default">
            {{ crumb.segment | sessionTitle: crumb.label }}
          </span>
        </ng-template>
      </ng-container>
    </nav>
  `,
})
export class BreadcrumbComponent {
  private router = inject(Router);
  breadcrumbs: Breadcrumb[] = [];

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => { this.breadcrumbs = this.createBreadcrumbs(this.router.url); });

    this.breadcrumbs = this.createBreadcrumbs(this.router.url);
  }

  private createBreadcrumbs(url: string): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    const pathSegments = url.split('?')[0].split('#')[0].split('/').filter(Boolean);

    let builtUrl = '';
    for (const seg of pathSegments) {
      builtUrl += `/${seg}`;
      breadcrumbs.push({
        segment: seg,
        label: this.formatLabel(seg),
        url: builtUrl,
      });
    }
    return breadcrumbs;
  }

  private formatLabel(segment: string): string {
    const map: Record<string, string> = { iam: 'IAM', chat: 'Chat' };
    if (segment in map) return map[segment];
    return segment
      .split('-')
      .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
}
