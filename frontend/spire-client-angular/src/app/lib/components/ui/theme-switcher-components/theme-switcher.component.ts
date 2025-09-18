// theme-switcher.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../modules/themes/theme.service';
import { OptionItemToggleGroupComponent } from '../option-list-components/option-item-toggle-group.component';
import { OptionItem } from '../option-list-components/option-item.model';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule, OptionItemToggleGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="w-full flex flex-col items-center justify-between">
    @if (options().length > 0) {
      <option-item-toggle-group
          [options]="options()"
          [selected]="selectedId()"
          (selectedChange)="onSelectedChange($event)"
          [indicatorClass]="'bg-secondary/50 rounded-lg'"
          [indicatorMargin]="6"
          [gap]="6"
        />
    } @else {
      <div class="text-sm text-muted-foreground">Loading themes…</div>
    }
  </div>
  `,
})
export class ThemeSwitcherComponent implements OnInit, OnDestroy {
  // UI signals
  readonly options = signal<OptionItem[]>([]);
  readonly selectedId = signal<string>('');

  private stopPolling?: number;

  constructor(private readonly theme: ThemeService) {
    // Keep selectedId synced when ThemeService announces changes
    ThemeService.themeChanged.subscribe(t => {
      if (!t) return;
      // ensure options exist (late arrival)
      if (this.options().length === 0) this.buildOptions();
      this.selectedId.set(t.name);
    });

    // lazy-build options once themes are available
    effect(() => {
      if (this.options().length === 0) this.buildOptions();
    });
  }

  ngOnInit(): void {
    // Poll briefly until the service finishes loading themes (since it loads in ctor via HTTP)
    // Stops automatically once options are built.
    this.stopPolling = window.setInterval(() => {
      if (this.options().length > 0) {
        if (this.stopPolling) clearInterval(this.stopPolling);
        this.stopPolling = undefined;
      } else {
        this.buildOptions();
      }
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.stopPolling) clearInterval(this.stopPolling);
  }

  onSelectedChange(themeName: string) {
    if (!themeName) return;
    this.theme.applyThemeByName(themeName);
    // ThemeService will emit and our subscriber will keep selectedId in sync.
  }

  private buildOptions() {
    const themes = this.theme.getAllThemes();
    if (!themes || themes.length === 0) return;

    const items: OptionItem[] = themes.map(t => ({
      id: t.name,
      // Use whatever fields your <app-option-item> expects. Commonly:
      label: t.name,
      // Optional: small color dot preview from a key like 'accent' or 'primary'
      // subtitle: t.colors?.accent ?? '',
      onClick: () => this.theme.applyThemeByName(t.name),
    }));

    this.options.set(items);

    // Initialize selected value from current theme (or first)
    const current = this.theme.getCurrentTheme();
    this.selectedId.set(current?.name ?? themes[0].name);
  }
}
