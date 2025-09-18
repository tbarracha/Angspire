// ui-theme.controller.ts
import {
  Directive, ElementRef, HostBinding, HostListener, Input, OnDestroy, OnInit, inject, signal
} from '@angular/core';
import { ThemeService } from '../theme.service';
import {
  ColorRef, CssSize, StateKey, UiStyle, UiColors, UiCorners, UiBorder, UiOutline, UiSpacing,
  UiTypography, UiEffects, UiInteractions, UI_BASE_IDLE, deepClone, deepMerge
} from '../theme-types';

type PartKey = keyof UiStyle;

/**
 * Attach this once per element: [uiTheme]
 * Other part directives inject this via @Host() and call updatePart(...).
 */
@Directive({
  selector: '[uiTheme]',
  standalone: true,
  exportAs: 'uiThemeCtrl'
})
export class UiThemeController implements OnInit, OnDestroy {
  private theme = inject(ThemeService);
  private el = inject(ElementRef<HTMLElement>);

  // state flags (bindable if needed)
  @Input() disabled = false;
  @Input() selected = false;
  @Input() ariaCurrent?: any;
  @Input() ariaExpanded?: any;

  // theme tick
  private themeTick = signal(0);
  private sub?: { unsubscribe?: () => void };

  // Spec per state; ‘idle’ must exist
  private spec: Record<StateKey, UiStyle> = {
    idle: deepClone(UI_BASE_IDLE),
    hover: {},
    focus: {},
    active: {},
    disabled: {},
    selected: {},
    ariaCurrent: {},
    ariaExpanded: {},
  };

  // interaction signals (JS-driven for programmatic application)
  private hovering = signal(false);
  private focusing = signal(false);
  private activing = signal(false);

  /* ========= Host events for interaction states ========= */
  @HostListener('mouseenter') onEnter() { if (!this.disabled) this.hovering.set(true), this.apply(); }
  @HostListener('mouseleave') onLeave() { this.hovering.set(false); this.apply(); }
  @HostListener('focusin') onFocusIn()  { if (!this.disabled) this.focusing.set(true), this.apply(); }
  @HostListener('focusout') onFocusOut(){ this.focusing.set(false); this.apply(); }
  @HostListener('mousedown') onDown()   { if (!this.disabled) this.activing.set(true), this.apply(); }
  @HostListener('mouseup') onUp()       { this.activing.set(false); this.apply(); }

  ngOnInit() {
    this.sub = (ThemeService as any).themeChanged?.subscribe?.(() => {
      this.themeTick.update(n => n + 1);
      this.apply();
    });
    queueMicrotask(() => this.apply());
  }
  ngOnDestroy() { try { this.sub?.unsubscribe?.(); } catch {} }

  @HostBinding('attr.disabled') get hostDisabledAttr() { return this.disabled ? '' : null; }
  @HostBinding('attr.aria-disabled') get hostAriaDisabled() { return this.disabled ? 'true' : null; }
  @HostBinding('attr.aria-selected') get hostAriaSelected() { return this.selected ? 'true' : null; }
  @HostBinding('attr.aria-current') get hostAriaCurrent() { return this.ariaCurrent ? 'true' : null; }
  @HostBinding('attr.aria-expanded') get hostAriaExpanded() { return this.ariaExpanded ? 'true' : null; }

  /* ========= Public API for part directives ========= */

  /** Merge a partial style into a specific state (‘idle’ if ommitted) */
  updatePart(part: PartKey, patch: any, state: StateKey = 'idle') {
    const bucket = (this.spec[state] ??= {});
    deepMerge(bucket, { [part]: patch });
    this.apply();
  }

  /** Resolve a token/palette/literal using ThemeService */
  resolveColor = (ref?: ColorRef): string | null => {
    const s = (ref ?? '').trim();
    if (!s) return null;
    const token = this.theme.getTokenHex(s);
    if (token) return token;
    if (s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl')) return s;
    const pal = this.theme.resolveColor(s);
    if (pal) return pal;
    const last = s.split(/[.\s/:_-]+/).pop() || '';
    if (last) {
      const late = this.theme.resolveColor(last);
      if (late) return late;
    }
    return null;
  };

  toCssLength = (v?: CssSize): string | null => {
    if (v == null) return null;
    if (typeof v === 'number') return `${v}px`;
    const s = `${v}`.trim();
    if (!s) return null;
    const tokenMaybe = this.theme.getTokenHex(s);
    return tokenMaybe ?? s;
  };

  radiusToCss = (v?: 'none'|'sm'|'md'|'lg'|'xl'|'2xl'|'full'|CssSize): string | null => {
    if (v == null) return null;
    if (typeof v === 'string') {
      switch (v) {
        case 'none': return '0';
        case 'sm': return '0.125rem';
        case 'md': return '0.375rem';
        case 'lg': return '1rem';
        case 'xl': return '1.25rem';
        case '2xl': return '1.5rem';
        case 'full': return '9999px';
        default: return this.toCssLength(v);
      }
    }
    if (typeof v === 'number') return `${v}px`;
    return null;
  };

  /* ========= Apply effective style (programmatic, no CSS vars) ========= */

  apply() {
    void this.themeTick();

    // Determine effective state chain (by priority)
    const order: StateKey[] = [
      'idle',
      'ariaExpanded',
      'ariaCurrent',
      'selected',
      ...(this.hovering() ? (['hover'] as StateKey[]) : []),
      ...(this.focusing() ? (['focus'] as StateKey[]) : []),
      ...(this.activing() ? (['active'] as StateKey[]) : []),
      ...(this.disabled ? (['disabled'] as StateKey[]) : []),
    ];
    // recompute with exact priority: disabled wins last
    const eff: UiStyle = {};
    for (const k of order) deepMerge(eff, this.spec[k]);

    this.applyToHost(eff);
  }

  private applyToHost(s: UiStyle) {
    const host = this.el.nativeElement;
    const st = host.style;

    // Colors
    const cText = this.resolveColor(s.colors?.text);
    const cBg = this.resolveColor(s.colors?.bg);
    const cBorder = this.resolveColor(s.colors?.border?.color ?? s.border?.color);
    const cOutline = this.resolveColor(s.colors?.outline?.color ?? s.outline?.color);
    const cCaret = this.resolveColor(s.colors?.caret);
    const cPlaceholder = this.resolveColor(s.colors?.placeholder);
    // selection colors don't directly apply via inline; skip here (node layer could attach handlers if needed)

    st.color = cText ?? '';
    st.backgroundColor = cBg ?? '';
    st.setProperty('border-color', cBorder ?? '');
    st.setProperty('outline-color', cOutline ?? '');
    st.setProperty('caret-color', cCaret ?? '');
    // placeholders for inputs are engine-specific; prefer Node layer later

    // Corners
    st.borderRadius = this.radiusToCss(s.corners?.radius) ?? '';

    // Border
    applyEdgeSize(st, 'border', s.border?.width, this.toCssLength);
    if (s.border?.style) st.borderStyle = s.border.style;

    // Outline
    st.outlineWidth = this.toCssLength(s.outline?.width) ?? '';
    st.outlineOffset = this.toCssLength(s.outline?.offset) ?? '';

    // Spacing & size
    applyEdgeSize(st, 'padding', s.spacing?.padding, this.toCssLength);
    applyEdgeSize(st, 'margin', s.spacing?.margin, this.toCssLength);
    st.gap = this.toCssLength(s.spacing?.gap) ?? '';
    const size = s.spacing?.size ?? {};
    st.width = this.toCssLength(size.w) ?? '';
    st.height = this.toCssLength(size.h) ?? '';
    st.minWidth = this.toCssLength(size.minW) ?? '';
    st.minHeight = this.toCssLength(size.minH) ?? '';
    st.maxWidth = this.toCssLength(size.maxW) ?? '';
    st.maxHeight = this.toCssLength(size.maxH) ?? '';

    // Typography
    if (s.typography?.font?.family) st.fontFamily = s.typography.font.family;
    st.fontSize = this.toCssLength(s.typography?.fontSize) ?? '';
    if (s.typography?.fontWeight != null) st.fontWeight = `${s.typography.fontWeight}`;
    st.lineHeight = this.toCssLength(s.typography?.lineHeight) ?? '';
    st.letterSpacing = this.toCssLength(s.typography?.letterSpacing) ?? '';
    if (s.typography?.textTransform) st.textTransform = s.typography.textTransform;
    if (s.typography?.textAlign) st.textAlign = s.typography.textAlign;
    if (s.typography?.whiteSpace) st.whiteSpace = s.typography.whiteSpace;
    if (s.typography?.wordBreak) st.wordBreak = s.typography.wordBreak;
    if (s.typography?.hyphens) st.hyphens = s.typography.hyphens;

    // Effects
    if (s.effects?.shadow) st.boxShadow = toBoxShadow(s.effects.shadow);
    const filter = buildFilter({
      backdropBlur: s.effects?.backdropBlur,
      blur: s.effects?.blur,
      brightness: s.effects?.brightness,
      contrast: s.effects?.contrast,
      grayscale: s.effects?.grayscale,
    });
    if (filter) st.setProperty('backdrop-filter', filter.backdrop);
    st.filter = filter.front ?? '';
    if (s.effects?.opacity != null) st.opacity = `${s.effects.opacity}`;

    // Interactions
    if (s.interactions?.transition) {
      const props = (s.interactions.transition.properties ?? ['color','background-color','border-color','outline-color','box-shadow']).join(', ');
      st.transitionProperty = props;
      if (s.interactions.transition.duration != null) st.transitionDuration = `${s.interactions.transition.duration}ms`;
      if (s.interactions.transition.timing) st.transitionTimingFunction = s.interactions.transition.timing;
    }
    if (s.interactions?.cursor) st.cursor = s.interactions.cursor;
    if (s.interactions?.pointerEvents) st.pointerEvents = s.interactions.pointerEvents;
  }
}

/* ===== helpers ===== */
function applyEdgeSize(
  st: CSSStyleDeclaration, prop: 'padding'|'margin'|'border',
  val: any, toCss: (v?: CssSize)=>string|null
) {
  if (val == null) return;
  if (typeof val === 'number' || typeof val === 'string') {
    const v = toCss(val) ?? '';
    if (prop === 'border') st.setProperty('border-width', v);
    else st.setProperty(prop, v);
    return;
  }
  for (const [k, each] of Object.entries(val as Record<string, CssSize>)) {
    const v = toCss(each) ?? '';
    switch (k) {
      case 'x': st.setProperty(`${prop}-left`, v); st.setProperty(`${prop}-right`, v); break;
      case 'y': st.setProperty(`${prop}-top`, v); st.setProperty(`${prop}-bottom`, v); break;
      case 'top':
      case 'right':
      case 'bottom':
      case 'left': st.setProperty(`${prop}-${k}`, v); break;
      case 'all': if (prop === 'border') st.setProperty('border-width', v); else st.setProperty(prop, v); break;
    }
  }
}

function toBoxShadow(sh: string): string {
  switch (sh) {
    case 'none': return 'none';
    case 'sm': return '0 1px 2px 0 rgba(0,0,0,0.05)';
    case 'md': return '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)';
    case 'lg': return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
    case 'xl': return '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
    default: return sh;
  }
}

function buildFilter(parts: { backdropBlur?: string; blur?: string; brightness?: string; contrast?: string; grayscale?: string; }) {
  const front: string[] = [];
  if (parts.blur) front.push(`blur(${parts.blur})`);
  if (parts.brightness) front.push(`brightness(${parts.brightness})`);
  if (parts.contrast) front.push(`contrast(${parts.contrast})`);
  if (parts.grayscale) front.push(`grayscale(${parts.grayscale})`);
  const backdrop = parts.backdropBlur ? `blur(${parts.backdropBlur})` : '';
  return { front: front.length ? front.join(' ') : '', backdrop };
}
