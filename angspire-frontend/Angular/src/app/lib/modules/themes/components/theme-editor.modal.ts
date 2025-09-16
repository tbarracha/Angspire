// src/app/lib/components/theme/theme-editor.modal.ts
import { Component, computed, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { THEME_KEYS, Theme } from '../theme';
import { ThemeService } from '../theme.service';
import { TailwindColorPickerComponent } from './tailwind-color-picker.component';
import { ColorFamily, ColorSelection, PALETTE, Shade } from './tailwind-color-types';
import { MODAL_CLOSE } from '../../../components/ui/modal-components/modal.service';

@Component({
  standalone: true,
  selector: 'app-theme-editor-modal',
  imports: [CommonModule, TailwindColorPickerComponent],
  template: `
  <div class="flex flex-col min-h-0 w-full">
    <!-- Top row (header) -->
    <div class="shrink-0 pb-3 border-b bg-white/90 backdrop-blur">
      <div class="grid grid-cols-[1fr_auto] gap-4">
        <div class="flex flex-wrap gap-2 items-center">
          <div class="text-sm font-semibold">Themes:</div>
          @for (t of themes(); track t.name) {
            <button
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full border hover:bg-gray-50 cursor-pointer"
              [class.bg-gray-900]="t.name === currentName()"
              [class.text-white]="t.name === currentName()"
              [class.border-gray-900]="t.name === currentName()"
              (click)="selectTheme(t.name)"
            >{{ t.name }}</button>
          } @empty {
            <div class="text-sm text-gray-500">No themes loaded</div>
          }
        </div>

        <div class="flex gap-2 justify-end">
          <button class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition" (click)="duplicate()">Duplicate</button>
          <button class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition" (click)="add()">Add</button>
          <button class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition disabled:opacity-50" (click)="remove()" [disabled]="!current()">Delete</button>
          <button class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition" (click)="export()">Export</button>
          <label class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition cursor-pointer">
            Import <input type="file" accept="application/json" class="hidden" (change)="onImport($event)" />
          </label>
        </div>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-4 mt-3">
        <input
          class="rounded-lg border px-3 py-2 w-full"
          type="text"
          placeholder="Theme name"
          [value]="currentName()"
          (input)="rename(($any($event.target)).value)"
        />
        <div class="flex gap-2 justify-end">
          <button class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition" (click)="apply()">Apply</button>
          <button class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow transition" (click)="applySmooth()">Apply Smooth</button>
        </div>
      </div>
    </div>

    <!-- Bottom row (scrollable content) -->
    <div class="flex-1 min-h-0 overflow-auto">
      @if (current(); as cur) {
        <div class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] mt-4">
          @for (k of keys; track k) {
            <div class="rounded-xl p-3 flex flex-col gap-2">
              <!-- Top row: title -->
              <div class="text-sm font-medium truncate">{{ k }}</div>

              <!-- Bottom row: swatch (left) + input (right) -->
              <div class="flex flex-row items-center gap-2 h-10">
                <!-- Swatch trigger -->
                <button
                  type="button"
                  class="h-full aspect-square rounded-md border shadow-sm cursor-pointer"
                  [style.backgroundColor]="cur.colors[k] || '#000'"
                  [title]="'Pick ' + k"
                  (click)="picker.openAt($any($event.currentTarget), toSelection(cur.colors[k]))">
                </button>

                <!-- Color value input -->
                <input
                  class="h-full w-full rounded-lg border px-3"
                  [value]="cur.colors[k] || ''"
                  (input)="updateKey(k, ($any($event.target)).value)"
                  placeholder="#RRGGBB" />
              </div>

              <!-- Hidden picker instance to handle overlay & selection -->
              <app-tailwind-color-picker
                #picker
                [model]="toSelection(cur.colors[k])"
                (modelChange)="onPick(k, $event)"
                class="hidden">
              </app-tailwind-color-picker>
            </div>
          }
        </div>
      } @else {
        <div class="text-sm text-gray-500 mt-6">No theme selected.</div>
      }
    </div>
  </div>
`
})
export class ThemeEditorModalComponent implements OnInit, OnDestroy {
  private themeSvc = inject(ThemeService);
  private closeModal = inject(MODAL_CLOSE, { optional: true });

  keys = THEME_KEYS;

  private _current = signal<Theme | null>(this.themeSvc.getCurrentTheme());
  private _themes  = signal<Theme[]>(this.themeSvc.getAllThemes());

  themes      = computed(() => this._themes());
  current     = computed<Theme | null>(() => this._current());
  currentName = computed(() => this.current()?.name ?? '');

  private sub?: any;

  ngOnInit(): void {
    this.sub = (ThemeService as any).themeChanged?.subscribe?.((t: Theme) => {
      this._current.set(t);
      this._themes.set(this.themeSvc.getAllThemes());
    });
  }

  ngOnDestroy(): void {
    try { this.sub?.unsubscribe?.(); } catch {}
  }

  /* actions ------------------------------------------------------- */
  selectTheme(name: string) { this.themeSvc.applyThemeByName(name); }

  rename(newName: string) {
    const cur = this.current();
    if (!cur) return;
    const next: Theme = { ...cur, name: (newName ?? '').trim() || cur.name };
    this.themeSvc.updateTheme(cur.name, next);
    this._themes.set(this.themeSvc.getAllThemes());
    this._current.set(this.themeSvc.getCurrentTheme());
  }

  updateKey(key: string, value: string) {
    const cur = this.current();
    if (!cur) return;
    const next: Theme = { ...cur, colors: { ...cur.colors, [key]: value } };
    this.themeSvc.updateTheme(cur.name, next);
    document.documentElement.style.setProperty(`--${key}`, value);
    this._current.set({ ...next });
  }

  onPick(key: string, sel: ColorSelection) { this.updateKey(key, sel.hex); }

  /** Preselect in picker if hex matches a Tailwind color */
  toSelection(hex?: string | null): ColorSelection | null {
    if (!hex) return null;
    const norm = hex.toLowerCase();
    const shades: Shade[] = [50,100,200,300,400,500,600,700,800,900,950];
    for (const fam of Object.keys(PALETTE) as ColorFamily[]) {
      const map = PALETTE[fam];
      for (const s of shades) {
        if ((map[s] as string).toLowerCase() === norm) {
          return { family: fam, shade: s, hex: map[s], tailwindBgClass: `bg-${fam.toLowerCase()}-${s}` };
        }
      }
    }
    return null;
  }

  add() {
    const name = this.uniqueName('New Theme');
    const baseColors = this.current()?.colors ?? {};
    const colors = Object.fromEntries(this.keys.map(k => [k, baseColors[k] ?? '#000000']));
    this.themeSvc.addTheme({ name, colors });
    this.themeSvc.applyThemeByName(name);
    this._themes.set(this.themeSvc.getAllThemes());
    this._current.set(this.themeSvc.getCurrentTheme());
  }

  duplicate() {
    const cur = this.current();
    if (!cur) return;
    const name = this.uniqueName(`${cur.name} Copy`);
    this.themeSvc.addTheme({ name, colors: { ...cur.colors } });
    this.themeSvc.applyThemeByName(name);
    this._themes.set(this.themeSvc.getAllThemes());
    this._current.set(this.themeSvc.getCurrentTheme());
  }

  remove() {
    const cur = this.current();
    if (!cur) return;
    this.themeSvc.deleteTheme(cur.name);
    this._themes.set(this.themeSvc.getAllThemes());
    this._current.set(this.themeSvc.getCurrentTheme());
  }

  apply()       { const cur = this.current(); if (cur) this.themeSvc.applyThemeByName(cur.name); }
  applySmooth() { const cur = this.current(); if (cur) this.themeSvc.applyThemeSmoothByName(cur.name, 220); }

  export() {
    const json = this.themeSvc.exportThemesJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'themes.json';
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }

  onImport(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      this.themeSvc.importThemesJson(text);
      input.value = '';
      this._themes.set(this.themeSvc.getAllThemes());
      this._current.set(this.themeSvc.getCurrentTheme());
    };
    reader.readAsText(file);
  }

  private uniqueName(base: string): string {
    const names = new Set(this._themes().map(t => (t.name ?? '').toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    let i = 2;
    while (names.has(`${base} ${i}`.toLowerCase())) i++;
    return `${base} ${i}`;
  }
}
