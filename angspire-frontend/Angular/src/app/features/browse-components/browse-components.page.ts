// src/app/pages/browse-components.page.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeEditorToolbarComponent } from '../../lib/modules/themes/components/theme-editor-toolbar.component';
import { TailwindColorPickerComponent } from '../../lib/modules/themes/components/tailwind-color-picker.component';
import { ColorSelection } from '../../lib/modules/themes/components/tailwind-color-types';

type DemoItem = { path: string; label: string };

@Component({
  standalone: true,
  selector: 'app-browse-components',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ThemeEditorToolbarComponent, TailwindColorPickerComponent],
  template: `
    <div class="flex h-full w-full bg-background text-light">
      <!-- Top header -->
      <header class="fixed left-0 right-0 top-0 z-40 bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between">
        <h1 class="text-sm font-semibold text-foreground">Angspire Components</h1>

        <!-- Right side: Color picker (left) + Theme editor (right) -->
        <div class="flex items-center gap-2">
          <app-tailwind-color-picker
            (modelChange)="onQuickAccent($event)"
          />
          <app-theme-editor-toolbar />
        </div>
      </header>

      <!-- Body -->
      <div class="mt-[48px] flex w-full h-[calc(100vh-48px)]">
        <!-- Left list -->
        <aside class="w-64 flex flex-col border-r bg-background p-6 overflow-hidden">
          <h2 class="text-sm font-semibold mb-4 uppercase tracking-wide text-light">Components</h2>
          <nav class="flex-1 overflow-y-auto pr-1 space-y-1">
            @for (c of items; track c.path) {
              <a
                [routerLink]="['/components', c.path]"
                routerLinkActive="bg-accent text-light"
                class="h-10 max-h-10 px-3 rounded-lg hover:bg-accent/50 flex items-center text-sm truncate"
                [title]="c.label"
              >{{ c.label }}</a>
            }
          </nav>
        </aside>

        <!-- Demo outlet -->
        <section class="flex-1 p-6 bg-light text-dark overflow-auto">
          <router-outlet />
        </section>
      </div>
    </div>
  `
})
export class BrowseComponentsPage {
  items: DemoItem[] = [
    { path: 'button', label: 'Button' },
    { path: 'input',  label: 'Input'  },
    { path: 'select', label: 'Select' },
  ];

  quickAccent = signal<ColorSelection | null>(null);

  onQuickAccent(sel: ColorSelection) {
    // Example: update --accent live; change the var name to whatever you prefer
    document.documentElement.style.setProperty('--accent', sel.hex);
  }
}
