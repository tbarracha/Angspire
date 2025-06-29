import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

interface Breadcrumb {
    label: string;
    url: string;
}

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <nav class="flex text-sm items-center gap-3 text-foreground-text font-semibold" aria-label="Breadcrumb">
      <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
        <ng-container *ngIf="!last; else lastBreadcrumb">
          <a
            [routerLink]="crumb.url"
            class="text-foreground-text/60 hover:text-accent transition-colors"
          >
            {{ crumb.label }}
          </a>
          <span class="mx-2 select-none">/</span>
        </ng-container>
        <ng-template #lastBreadcrumb>
          <span class="cursor-default">{{ crumb.label }}</span>
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
            .subscribe(() => {
                this.breadcrumbs = this.createBreadcrumbs(this.router.url);
            });
        // Initialize on first load as well
        this.breadcrumbs = this.createBreadcrumbs(this.router.url);
    }

    private createBreadcrumbs(url: string): Breadcrumb[] {
        const breadcrumbs: Breadcrumb[] = [];
        // Remove query string/hash, then split on "/"
        const pathSegments = url.split('?')[0].split('#')[0].split('/').filter(seg => seg);

        let builtUrl = '';
        for (let i = 0; i < pathSegments.length; i++) {
            builtUrl += `/${pathSegments[i]}`;
            breadcrumbs.push({
                label: this.formatLabel(pathSegments[i]),
                url: builtUrl,
            });
        }

        return breadcrumbs;
    }

    private formatLabel(segment: string): string {
        const map: Record<string, string> = {
            'iam': 'IAM',
            // Add exceptions here
        };
        if (map[segment]) return map[segment];

        // Split by '-', capitalize each, join with space
        return segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
