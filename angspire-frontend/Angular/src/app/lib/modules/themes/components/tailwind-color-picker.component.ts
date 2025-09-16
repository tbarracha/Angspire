// src/app/lib/components/theme/tailwind-color-picker.component.ts
import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  EnvironmentInjector, TemplateRef, ViewContainerRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorFamily, ColorSelection, PALETTE, Shade } from './tailwind-color-types';
import { OverlayPanelService } from '../../overlay/overlay-panel.service';

function toTailwindBgClass(family: ColorFamily, shade: Shade) {
  return `bg-${String(family).toLowerCase()}-${shade}`;
}

@Component({
  selector: 'app-tailwind-color-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Optional trigger (can be hidden by parent) -->
    <button #trigger type="button"
            class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm hover:shadow transition bg-white/80"
            (click)="openAt(trigger)"
            [style.borderColor]="model?.hex ?? '#e5e7eb'">
      <span class="inline-block rounded-full w-4 h-4 border shadow-sm"
            [style.backgroundColor]="model?.hex ?? '#fff'"></span>
      <span class="text-sm">
        @if (model; as c) { {{ c.family }} {{ c.shade }} ({{ c.hex }}) } @else { Pick a color }
      </span>
      <svg width="14" height="14" viewBox="0 0 20 20" class="opacity-60">
        <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- PANEL CONTENT -->
    <ng-template #panelTpl>
      <div class="relative min-w-[280px] w-full min-h-0 flex flex-col">
        <!-- Top (fixed height) -->
        <div class="w-full h-12 shrink-0 sticky top-0 z-10 bg-white/95 backdrop-blur border-b flex items-center">
          <input
            class="w-full rounded-xl border px-3 py-2 outline-none"
            type="text"
            placeholder="Search families (e.g. Blue, Slate, Violet)"
            [value]="query"
            (input)="query = ($any($event.target)).value"
          />
        </div>

        <!-- Body (remaining space) -->
        <div class="w-full flex-1 min-h-0">
          <div class="space-y-3 pt-2">
            <ng-container *ngFor="let fam of filteredFamilies">
              <div class="space-y-2">
                <div class="flex items-center justify-between min-w-0">
                  <div class="text-sm font-semibold text-gray-800 truncate">{{ fam }}</div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    *ngFor="let sh of shades"
                    type="button"
                    class="relative inline-flex items-center justify-center w-7 h-7 rounded-full border transition hover:ring-2 hover:ring-gray-300"
                    [class.ring-2]="isSelected(fam, sh)"
                    [class.ring-offset-2]="isSelected(fam, sh)"
                    [class.ring-gray-900]="isSelected(fam, sh)"
                    [style.backgroundColor]="hex(fam, sh)"
                    [attr.title]="fam + ' ' + sh"
                    (click)="select(fam, sh)"
                  ></button>
                </div>
              </div>
            </ng-container>

            <div class="text-xs text-gray-500 pb-1">Click a circle to select. Press Esc to close.</div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class TailwindColorPickerComponent {
  @Input()  model: ColorSelection | null = null;
  @Output() modelChange = new EventEmitter<ColorSelection>();

  @ViewChild('panelTpl', { read: TemplateRef }) private panelTpl!: TemplateRef<any>;

  // State
  query = '';
  families = Object.keys(PALETTE) as ColorFamily[];
  shades: Shade[] = [50,100,200,300,400,500,600,700,800,900,950];
  private closeOverlay: (() => void) | null = null;

  constructor(
    private panels: OverlayPanelService,
    private env: EnvironmentInjector,
    private vcr: ViewContainerRef
  ) {}

  get filteredFamilies(): ColorFamily[] {
    const q = this.query.trim().toLowerCase();
    return q ? this.families.filter(f => f.toLowerCase().includes(q)) : this.families;
  }
  hex(f: ColorFamily, s: Shade) { return PALETTE[f][s]; }
  isSelected(f: ColorFamily, s: Shade) { return !!this.model && this.model.family === f && this.model.shade === s; }

  /** NEW: open panel anchored to any element */
  openAt(anchor: HTMLElement, initial?: ColorSelection | null) {
    if (initial) this.model = initial;

    const h = this.panels.openTemplate(
      anchor,
      this.panelTpl,
      this.vcr,
      this.env,
      {
        title: 'Pick a Tailwind color',
        paddingClass: 'p-3',
        width: 'auto',
        maxWidth: '94vw',
        maxHeight: '75vh',
        position: ['bottom-end','bottom-start','top-end','top-start'],
        panelClass: ['bg-transparent','p-0','rounded-2xl','shadow-none','border-0'],
      }
    );
    this.closeOverlay = h.close;
  }

  select(family: ColorFamily, shade: Shade) {
    const hex = this.hex(family, shade);
    const sel: ColorSelection = { family, shade, hex, tailwindBgClass: toTailwindBgClass(family, shade) };
    this.model = sel;
    this.modelChange.emit(sel);
    this.closeOverlay?.();
  }
}
