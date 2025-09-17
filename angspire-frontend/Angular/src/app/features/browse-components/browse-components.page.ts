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
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ThemeEditorToolbarComponent,
    TailwindColorPickerComponent
  ],
  template: `
    <!-- App layout: row = sidebar (left) + main (right) -->
    <div class="h-full w-full flex flex-row bg-background text-light">
      <!-- Sidebar -->
      <aside class="w-64 shrink-0 flex flex-col bg-background p-6 min-h-0">
        <h2 class="text-sm font-semibold mb-4 uppercase tracking-wide text-light">
          Components
        </h2>

        <!-- Scrollable nav -->
        <nav class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
          @for (c of items; track c.path) {
            <a
              [routerLink]="['/components', c.path]"
              routerLinkActive="bg-light text-dark"
              class="h-10 max-h-10 px-3 rounded-full hover:bg-light/50
                     flex items-center text-sm truncate"
              [title]="c.label"
            >
              {{ c.label }}
            </a>
          }
        </nav>
      </aside>

      <!-- Main column: sticky header + scrollable content -->
      <main class="flex-1 min-w-0 flex flex-col min-h-0">
        <!-- Header (main column) -->
        <header
          class="bg-background/95 backdrop-blur
                 px-4 py-2 flex items-center justify-between"
        >
          <h1 class="text-sm font-semibold text-foreground">Angspire Components</h1>

          <!-- Right side: quick accent + theme editor -->
          <div class="flex items-center gap-2">
            <app-tailwind-color-picker (modelChange)="onQuickAccent($event)" />
            <app-theme-editor-toolbar />
          </div>
        </header>

        <!-- Content (fills remaining space, scrolls) -->
        <section class="flex-1 min-h-0 overflow-auto p-4 rounded-l-2xl bg-light text-dark">
          <router-outlet />
        </section>
      </main>
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
    // Example: update --accent live
    document.documentElement.style.setProperty('--accent', sel.hex);
  }
}
