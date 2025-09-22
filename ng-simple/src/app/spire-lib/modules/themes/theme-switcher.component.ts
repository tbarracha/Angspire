// theme-switcher.component.ts
import {
  Component, ChangeDetectionStrategy, Input, signal, effect,
  OnInit, OnDestroy, TemplateRef, ContentChild, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from './theme.service';

type Mode = 'toggle' | 'buttons' | 'grid';

interface ThemeOption {
  name: string;
  accent?: string | null;
}

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="w-full">
    @if (mode() === 'toggle') {
      <!-- Two-option toggle -->
      <div class="inline-flex rounded-xl border border-gray-300 overflow-hidden">
        @for (opt of options(); track opt.name) {
          <button
            class="px-4 py-2 text-sm font-medium transition
                   hover:bg-gray-100 focus:outline-none"
            [class.bg-gray-900]="selectedName() === opt.name"
            [class.text-white]="selectedName() === opt.name"
            (click)="onPick(opt.name)"
            type="button">
            {{ opt.name }}
          </button>
        } @empty {
          <div class="px-3 py-2 text-sm text-gray-500">No themes.</div>
        }
      </div>
    } @else if (mode() === 'buttons') {
      <!-- Inline buttons (good for small sets) -->
      <div class="flex flex-wrap items-center gap-2">
        @for (opt of options(); track opt.name) {
          @if (itemTpl) {
            <ng-container
              [ngTemplateOutlet]="itemTpl"
              [ngTemplateOutletContext]="{ $implicit: opt, selected: selectedName() === opt.name, pick: onPick.bind(this) }">
            </ng-container>
          } @else {
            <button
              class="px-3 py-2 rounded-lg border text-sm transition
                     hover:bg-gray-100 focus:outline-none"
              [class.border-gray-900]="selectedName() === opt.name"
              [class.bg-gray-900]="selectedName() === opt.name"
              [class.text-white]="selectedName() === opt.name"
              (click)="onPick(opt.name)"
              type="button">
              <span class="inline-flex items-center gap-2">
                <span class="h-3 w-3 rounded-full border" [style.backgroundColor]="opt.accent ?? ''"></span>
                {{ opt.name }}
              </span>
            </button>
          }
        } @empty {
          <div class="text-sm text-gray-500">No themes.</div>
        }
      </div>
    } @else {
      <!-- Grid (great for many themes) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        @for (opt of options(); track opt.name) {
          @if (itemTpl) {
            <ng-container
              [ngTemplateOutlet]="itemTpl"
              [ngTemplateOutletContext]="{ $implicit: opt, selected: selectedName() === opt.name, pick: onPick.bind(this) }">
            </ng-container>
          } @else {
            <button
              class="p-3 rounded-xl border text-left transition
                     hover:scale-[1.01] hover:shadow focus:outline-none"
              [class.border-gray-900]="selectedName() === opt.name"
              (click)="onPick(opt.name)"
              type="button">
              <div class="flex items-center gap-2">
                <span class="h-4 w-4 rounded-full border" [style.backgroundColor]="opt.accent ?? ''"></span>
                <span class="text-sm font-medium">{{ opt.name }}</span>
              </div>
            </button>
          }
        } @empty {
          <div class="text-sm text-gray-500">No themes.</div>
        }
      </div>
    }
  </div>
  `,
})
export class ThemeSwitcherComponent implements OnInit, OnDestroy {
  private readonly theme = inject(ThemeService);

  /** Display mode: 'toggle' (2 items), 'buttons' (row), 'grid' (cards) */
  @Input({ required: false }) set displayMode(v: Mode | undefined) {
    this._mode.set(v ?? 'buttons');
  }
  mode = signal<Mode>('buttons');

  /** Optional: explicit subset of theme names to show. If empty/undefined, show all. */
  @Input() themes?: string[];

  /** For 'toggle' mode, which two theme names to show. Defaults to Light/Dark if present. */
  @Input() togglePair: [string, string] | null = null;

  /** Animate theme switch using ThemeService.applyLerpedThemeByName */
  @Input() useLerp = true;

  /** Lerp duration (ms) */
  @Input() lerpDuration = 220;

  /** Optional custom template for an item (context: {$implicit: ThemeOption, selected: boolean, pick(name)}) */
  @ContentChild(TemplateRef) itemTpl?: TemplateRef<any>;

  readonly options = signal<ThemeOption[]>([]);
  readonly selectedName = signal<string>('');

  private _mode = this.mode;
  private sub?: { unsubscribe(): void };

  constructor() {
    // Keep UI in sync with current theme (committed) & rebuild options once available
    effect(() => {
      // track current theme signal (committed)
      const t = this.theme.currentTheme();
      if (t) this.selectedName.set(t.name);

      // lazy build once themes are loaded
      if (this.options().length === 0) this.buildOptions();
    });

    // Also listen to static emitter for external changes
    this.sub = ThemeService.themeChanged.subscribe(t => {
      if (!t) return;
      if (this.options().length === 0) this.buildOptions();
      this.selectedName.set(t.name);
    });
  }

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }

  onPick(name: string) {
    if (!name || name === this.selectedName()) return;
    if (this.useLerp) this.theme.applyLerpedThemeByName(name, this.lerpDuration);
    else this.theme.applyThemeByName(name);
    // selectedName will be updated by ThemeService signals/emitters
  }

  private buildOptions() {
    const all = this.theme.getAllThemes();
    if (!all || all.length === 0) return;

    let names: string[];
    if (this._mode() === 'toggle') {
      // Toggle mode expects exactly two
      const pair = this.togglePair ?? guessTogglePair(all);
      names = pair.filter(Boolean) as string[];
    } else if (this.themes && this.themes.length) {
      names = this.themes;
    } else {
      names = all.map(t => t.name);
    }

    const map = new Map(all.map(t => [t.name, t]));
    const opts: ThemeOption[] = names
      .map(n => map.get(n))
      .filter(Boolean)
      .map(t => ({
        name: t!.name,
        // try accent, fallback to primary for the dot
        accent: t!.colors['accent'] ?? t!.colors['primary'] ?? null,
      }));

    this.options.set(opts);

    // Ensure selectedName is consistent
    const current = this.theme.currentTheme();
    const sel = current?.name ?? opts[0]?.name ?? '';
    this.selectedName.set(sel);
  }
}

/* ---------------- helpers ---------------- */

function guessTogglePair(all: { name: string }[]): [string, string] {
  const names = all.map(t => t.name.toLowerCase());
  const hasLight = names.includes('light');
  const hasDark = names.includes('dark');
  if (hasLight && hasDark) return ['Light', 'Dark'];
  // otherwise pick first two
  return [all[0]?.name ?? '', all[1]?.name ?? ''];
}
