// theme-color-pair.directive.ts
import { Directive, Input, Optional, Self, OnChanges, SimpleChanges } from '@angular/core';
import { ThemePresetBus } from './theme-preset.bus';

@Directive({
  selector: `
    [colorBase],[color-content],[color-base],[colorContent],
    [hoverColorBase],[hover-color-base],[hoverColorContent],[hover-color-content],
    [activeColorBase],[active-color-base],[activeColorContent],[active-color-content],
    [focusColorBase],[focus-color-base],[focusColorContent],[focus-color-content],
    [focusedColorBase],[focused-color-base],[focusedColorContent],[focused-color-content],
    [focusRingColor],[focus-ring-color],
    [disabledColorBase],[disabled-color-base],[disabledColorContent],[disabled-color-content]
  `,
  standalone: true,
})
export class ThemeColorPairDirective implements OnChanges {
  constructor(@Optional() @Self() private bus: ThemePresetBus) {}

  // base
  @Input() colorBase?: string | null;
  @Input('color-base') colorBaseKebab?: string | null;
  @Input() colorContent?: string | null;
  @Input('color-content') colorContentKebab?: string | null;

  // hover
  @Input() hoverColorBase?: string | null;
  @Input('hover-color-base') hoverColorBaseKebab?: string | null;
  @Input() hoverColorContent?: string | null;
  @Input('hover-color-content') hoverColorContentKebab?: string | null;

  // active
  @Input() activeColorBase?: string | null;
  @Input('active-color-base') activeColorBaseKebab?: string | null;
  @Input() activeColorContent?: string | null;
  @Input('active-color-content') activeColorContentKebab?: string | null;

  // focus / focused (aliases)
  @Input() focusColorBase?: string | null;
  @Input('focus-color-base') focusColorBaseKebab?: string | null;
  @Input() focusColorContent?: string | null;
  @Input('focus-color-content') focusColorContentKebab?: string | null;

  @Input() focusedColorBase?: string | null;
  @Input('focused-color-base') focusedColorBaseKebab?: string | null;
  @Input() focusedColorContent?: string | null;
  @Input('focused-color-content') focusedColorContentKebab?: string | null;

  @Input() focusRingColor?: string | null;
  @Input('focus-ring-color') focusRingColorKebab?: string | null;

  // disabled
  @Input() disabledColorBase?: string | null;
  @Input('disabled-color-base') disabledColorBaseKebab?: string | null;
  @Input() disabledColorContent?: string | null;
  @Input('disabled-color-content') disabledColorContentKebab?: string | null;

  ngOnChanges(_c: SimpleChanges) {
    if (!this.bus) return;

    // base
    const baseBg = coalesce(this.colorBase, this.colorBaseKebab);
    const baseFg = coalesce(this.colorContent, this.colorContentKebab);
    if (baseBg !== undefined || baseFg !== undefined) this.bus.setBase(baseBg ?? undefined, baseFg ?? undefined);

    // hover
    const hovBg = coalesce(this.hoverColorBase, this.hoverColorBaseKebab);
    const hovFg = coalesce(this.hoverColorContent, this.hoverColorContentKebab);
    if (hovBg !== undefined || hovFg !== undefined) this.bus.setHover(hovBg ?? undefined, hovFg ?? undefined);

    // active
    const actBg = coalesce(this.activeColorBase, this.activeColorBaseKebab);
    const actFg = coalesce(this.activeColorContent, this.activeColorContentKebab);
    if (actBg !== undefined || actFg !== undefined) this.bus.setActive(actBg ?? undefined, actFg ?? undefined);

    // focus / focused (aliases)
    const focBg = coalesce(
      this.focusColorBase, this.focusColorBaseKebab,
      this.focusedColorBase, this.focusedColorBaseKebab
    );
    const focFg = coalesce(
      this.focusColorContent, this.focusColorContentKebab,
      this.focusedColorContent, this.focusedColorContentKebab
    );
    const ring = coalesce(this.focusRingColor, this.focusRingColorKebab);
    if (focBg !== undefined || focFg !== undefined || ring !== undefined) {
      this.bus.setFocus(focBg ?? undefined, focFg ?? undefined, ring ?? undefined);
    }

    // disabled
    const disBg = coalesce(this.disabledColorBase, this.disabledColorBaseKebab);
    const disFg = coalesce(this.disabledColorContent, this.disabledColorContentKebab);
    if (disBg !== undefined || disFg !== undefined) this.bus.setDisabled(disBg ?? undefined, disFg ?? undefined);
  }
}

function coalesce<T>(...vals: (T | undefined)[]): T | undefined {
  for (const v of vals) if (v !== undefined) return v;
  return undefined;
}
