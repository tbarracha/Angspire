// theme-style.directive.ts
import { Directive, Input, Optional, Self, inject, effect, Injector, DestroyRef, OnDestroy } from '@angular/core';
import { ThemeStateDirective, ThemeSpec } from './theme-state.directive';
import { ThemePresetBus, StyleKind, ColorPair } from './theme-preset.bus';
import { ThemeService } from '../theme.service';

@Directive({
  selector: '[themeStyle],[style-outline],[style-soft],[style-ghost],[style-dashed],[style-solid]',
  standalone: true,
})
export class ThemeStyleDirective implements OnDestroy {
  private readonly state = inject(ThemeStateDirective, { self: true });
  private readonly theme = inject(ThemeService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  @Input() themeStyle?: StyleKind;
  /** Optional radius token/length, e.g., 'md' | 'pill' | '8px' */
  @Input() radius?: string | number;

  private sub?: any;

  constructor(@Optional() @Self() private bus: ThemePresetBus) {
    // React to theme lerp & changes (so colors/ring recompute during animation)
    const e = effect(() => {
      this.theme.currentTheme();
      this.theme.animationTick();
      this.computeAndApply();
    }, { injector: this.injector });
    this.destroyRef.onDestroy(() => e.destroy());

    if (this.bus) {
      this.sub = this.bus.changed.subscribe(() => this.computeAndApply());
    }
  }

  ngOnDestroy() { try { this.sub?.unsubscribe?.(); } catch {} }

  ngOnInit() {
    this.applyStyleFromSelectorFallback();
    if (this.bus) {
      if (this.themeStyle) this.bus.setStyle(this.themeStyle);
      if (this.radius !== undefined) this.bus.setRadius(this.radius);
    }
    this.computeAndApply();
  }

  ngOnChanges() {
    if (this.bus) {
      if (this.themeStyle) this.bus.setStyle(this.themeStyle);
      if (this.radius !== undefined) this.bus.setRadius(this.radius);
    }
    this.computeAndApply();
  }

  private applyStyleFromSelectorFallback() {
    if (this.themeStyle) return;
    const host = (this.state as any).el?.nativeElement ?? null;
    const has = (attr: string) => host?.hasAttribute?.(attr);
    this.themeStyle =
      has('style-solid')  ? 'solid'  :
      has('style-soft')   ? 'soft'   :
      has('style-ghost')  ? 'ghost'  :
      has('style-dashed') ? 'dashed' :
      'outline';
  }

  private computeAndApply() {
    if (!this.state) return;

    const kind: StyleKind = this.themeStyle ?? this.bus?.styleKind ?? 'outline';
    const radius = (this.radius ?? this.bus?.radius ?? 'md') as (string | number);

    // get color pair for each state (fallback order: state → base → none)
    const basePair   = pickPair(this.bus?.base);
    const hoverPair  = pickPair(this.bus?.hover)  ?? basePair;
    const activePair = pickPair(this.bus?.active) ?? basePair;
    const focusPair  = pickPair(this.bus?.focus)  ?? hoverPair ?? basePair;
    const disabledPair = pickPair(this.bus?.disabled) ?? null;

    // Build ThemeSpec per state from (style kind + color pair)
    const base   = buildSpec(kind, basePair,   radius);
    const hoverK = this.bus?.hoverStyleKind ?? (kind === 'ghost' ? 'ghost' : 'soft');
    const hover  = buildSpec(hoverK, hoverPair, radius, /*isHover*/true);

    const focus: ThemeSpec = buildSpec(kind, focusPair, radius);
    focus.ring = true;
    // choose ring color if provided; else fall back to border/fg/bg in ThemeStateDirective
    const ringColor = (this.bus?.focus?.ring ?? null);
    if (ringColor) {
      focus.border = ringColor; // ThemeStateDirective uses border→fg→bg to choose ring color
      focus.ringW = 'focus';
    } else {
      focus.ringW = 'focus';
    }

    const active = buildSpec(kind, activePair, radius, /*isHover*/false, /*isActive*/true);

    const disabled: ThemeSpec | undefined = disabledPair
      ? buildSpec(kind, disabledPair, radius)
      : { classes: 'opacity-50 cursor-not-allowed' };

    // Apply to themeState
    this.state.base = base;
    this.state.hover = hover;
    this.state.focus = focus;
    this.state.active = active;
    this.state.disabledSpec = disabled;
    this.state.refresh();
  }
}

/** Normalize empty pairs to null */
function pickPair(p?: ColorPair | null): { bg: string | null; fg: string | null } | null {
  if (!p) return null;
  const bg = (p.base ?? null);
  const fg = (p.content ?? null);
  if (bg == null && fg == null) return null;
  return { bg, fg };
}

/** Translate style-kind + color pair into a concrete ThemeSpec (colors only; metrics set in directive) */
function buildSpec(
  kind: StyleKind,
  pair: { bg: string | null; fg: string | null } | null,
  radius: string | number,
  isHover = false,
  isActive = false
): ThemeSpec {
  // If no pair provided, leave fg undefined to auto-contrast later
  const bg = pair?.bg ?? null;
  const fg = pair?.fg ?? undefined;

  const common: ThemeSpec = {
    radius,
    classes: [
      isActive ? 'translate-y-px' : '',
      isHover ? 'shadow' : 'shadow-sm'
    ].filter(Boolean).join(' ')
  };

  switch (kind) {
    case 'ghost':
      return {
        ...common,
        bg: 'transparent',
        fg: fg ?? bg ?? undefined,
        borderStyle: 'none',
        borderW: 0
      };
    case 'dashed':
      return {
        ...common,
        bg: 'transparent',
        fg: fg ?? bg ?? undefined,
        border: fg ?? bg ?? undefined,
        borderStyle: 'dashed',
        borderW: 'hairline'
      };
    case 'outline':
      // filled background with contrast border (previous semantics)
      return {
        ...common,
        bg,
        fg, // ThemeState will auto-contrast if undefined
        border: fg ?? undefined,
        borderStyle: 'solid',
        borderW: 'hairline'
      };
    case 'soft':
    case 'solid':
    default:
      return {
        ...common,
        bg,
        fg,
        border: bg ?? undefined,
        borderStyle: 'solid',
        borderW: 'hairline'
      };
  }
}
