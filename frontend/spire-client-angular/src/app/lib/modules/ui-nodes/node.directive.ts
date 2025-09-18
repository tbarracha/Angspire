// ui-node.directive.ts
import {
  Directive, ElementRef, HostBinding, HostListener, Input,
  OnDestroy, OnInit, computed, inject, signal
} from '@angular/core';
import { ThemeService } from '../themes/theme.service';

import { UiNode } from './ui-node.types';
import { UiPhase, UiStyle, ColorRef, UiRadiusKey, CssSize, deepClone, UI_BARE_DEFAULT, deepMerge, UI_THEMED_AUGMENT, UiStateStyles } from '../themes/theme-types';

@Directive({
  selector: '[uiNode]',
  standalone: true,
})
export class UiNodeDirective implements OnInit, OnDestroy {
  private theme = inject(ThemeService);
  private el = inject(ElementRef<HTMLElement>);

  /* Phase & inputs */
  @Input() phase: UiPhase = 'bare';

  /** Full JSON node (preferred for LLM flow) */
  @Input() node?: UiNode;

  /** Style-only override (optional) */
  @Input() style?: Partial<UiStyle>;

  /** Quick convenience inputs (optional) */
  @Input() textColor?: ColorRef;
  @Input() bg?: ColorRef;
  @Input() borderColor?: ColorRef;
  @Input() outlineColor?: ColorRef;
  @Input() caret?: ColorRef;
  @Input() placeholder?: ColorRef;
  @Input() selectionBg?: ColorRef;
  @Input() selectionText?: ColorRef;

  @Input() radius?: UiRadiusKey | CssSize;
  @Input() padding?: any;
  @Input() margin?: any;
  @Input() gap?: CssSize;

  @Input() w?: CssSize; @Input() h?: CssSize;
  @Input() minW?: CssSize; @Input() minH?: CssSize;
  @Input() maxW?: CssSize; @Input() maxH?: CssSize;

  @Input() fontFamily?: string;
  @Input() fontSize?: CssSize;
  @Input() fontWeight?: string | number;
  @Input() lineHeight?: CssSize;
  @Input() letterSpacing?: CssSize;
  @Input() textTransform?: 'none'|'uppercase'|'lowercase'|'capitalize';
  @Input() textAlign?: 'left'|'center'|'right'|'justify';

  @Input() shadow?: 'none'|'sm'|'md'|'lg'|'xl'|string;
  @Input() opacity?: number;

  @Input() transitionProperties?: string[];
  @Input() transitionDuration?: number;
  @Input() transitionTiming?: string;
  @Input() cursor?: string;
  @Input() pointerEvents?: 'auto'|'none';

  @Input() variant?: string | null;

  @Input() disabled = false;
  @Input() selected = false;
  @Input() ariaCurrent?: any;
  @Input() ariaExpanded?: any;

  @Input() stateHover?: Partial<UiStyle>;
  @Input() stateFocus?: Partial<UiStyle>;
  @Input() stateActive?: Partial<UiStyle>;
  @Input() stateDisabled?: Partial<UiStyle>;
  @Input() stateSelected?: Partial<UiStyle>;
  @Input() stateAriaCurrent?: Partial<UiStyle>;
  @Input() stateAriaExpanded?: Partial<UiStyle>;

  private themeTick = signal(0);
  private sub?: { unsubscribe?: () => void };
  private hovering = signal(false);
  private focusing = signal(false);
  private activing = signal(false);

  @HostListener('mouseenter') onEnter() { if (!this.disabled) this.hovering.set(true); }
  @HostListener('mouseleave') onLeave() { this.hovering.set(false); }
  @HostListener('focusin')  onFocusIn() { if (!this.disabled) this.focusing.set(true); }
  @HostListener('focusout') onFocusOut() { this.focusing.set(false); }
  @HostListener('mousedown') onDown()   { if (!this.disabled) this.activing.set(true); }
  @HostListener('mouseup')   onUp()     { this.activing.set(false); }

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
  @HostBinding('class') get hostClass() { return this.disabled ? 'pointer-events-none cursor-not-allowed' : ''; }

  private resolved = computed<UiStyle>(() => {
    void this.themeTick();

    const base = deepClone(UI_BARE_DEFAULT) as UiStyle;
    if (this.phase === 'themed') deepMerge(base, UI_THEMED_AUGMENT);

    // node.style then raw style
    if (this.node?.style) deepMerge(base, this.node.style);
    if (this.style) deepMerge(base, this.style);

    // variants
    const dict =
      this.node?.variants
      ?? base.variants
      ?? {};
    const v = (this.variant ?? this.node?.variant ?? '').trim();
    if (v && dict[v]) deepMerge(base, dict[v] as Partial<UiStyle>);

    // convenience inputs last
    const conv: Partial<UiStyle> = {
      colors: {
        text: this.textColor,
        bg: this.bg,
        border: this.borderColor != null ? { color: this.borderColor } : undefined,
        outline: this.outlineColor != null ? { color: this.outlineColor } : undefined,
        caret: this.caret,
        placeholder: this.placeholder,
        selection: (this.selectionBg || this.selectionText) ? { bg: this.selectionBg, text: this.selectionText } : undefined,
      },
      corners: this.radius != null ? { radius: this.radius } : undefined,
      spacing: {
        padding: this.padding, margin: this.margin, gap: this.gap,
        size: { w: this.w, h: this.h, minW: this.minW, minH: this.minH, maxW: this.maxW, maxH: this.maxH }
      },
      typography: {
        font: this.fontFamily ? { family: this.fontFamily } : undefined,
        fontSize: this.fontSize, fontWeight: this.fontWeight, lineHeight: this.lineHeight,
        letterSpacing: this.letterSpacing, textTransform: this.textTransform, textAlign: this.textAlign
      },
      effects: { shadow: this.shadow, opacity: this.opacity },
      interactions: { transition: { properties: this.transitionProperties, duration: this.transitionDuration, timing: this.transitionTiming }, cursor: this.cursor, pointerEvents: this.pointerEvents }
    };
    deepMerge(base, conv);

    // states (typed; no TS4111)
    const mergedStates: UiStateStyles = {
      ...(base.states ?? {}),
      ...(this.node?.states ?? {}),
    };

    const extra: Partial<Record<keyof UiStateStyles, Partial<UiStyle> | undefined>> = {
      hover: this.stateHover,
      focus: this.stateFocus,
      active: this.stateActive,
      disabled: this.stateDisabled,
      selected: this.stateSelected,
      ariaCurrent: this.stateAriaCurrent,
      ariaExpanded: this.stateAriaExpanded,
    };

    const take = (k: keyof UiStateStyles, when: boolean) => {
      if (!when) return;
      const patch = extra[k] ?? mergedStates[k];
      if (patch) deepMerge(base, patch);
    };

    take('disabled',   this.disabled);
    take('selected',   this.selected);
    take('ariaCurrent',  !!this.ariaCurrent);
    take('ariaExpanded', !!this.ariaExpanded);
    take('active',     this.activing());
    take('focus',      this.focusing());
    take('hover',      this.hovering());

    return base;
  });

  private apply() {
    const host = this.el.nativeElement;
    const st = host.style;
    const s = this.resolved();

    // colors
    const color = this.resolveColor(s.colors?.text);
    const bg = this.resolveColor(s.colors?.bg);
    const bcol = this.resolveColor(s.colors?.border?.color ?? s.border?.color);
    const ocol = this.resolveColor(s.colors?.outline?.color ?? s.outline?.color);
    const caret = this.resolveColor(s.colors?.caret);
    const placeholder = this.resolveColor(s.colors?.placeholder);
    const selBg = this.resolveColor(s.colors?.selection?.bg);
    const selText = this.resolveColor(s.colors?.selection?.text);

    st.color = color ?? '';
    st.backgroundColor = bg ?? '';
    if (bcol) st.setProperty('border-color', bcol);
    if (ocol) st.setProperty('outline-color', ocol);
    if (caret) st.setProperty('caret-color', caret);

    if (color) host.style.setProperty('--ui-text', color);
    if (bg) host.style.setProperty('--ui-bg', bg);
    if (bcol) host.style.setProperty('--ui-border', bcol);
    if (ocol) host.style.setProperty('--ui-outline', ocol);
    if (caret) host.style.setProperty('--ui-caret', caret);
    if (placeholder) host.style.setProperty('--ui-placeholder', placeholder);
    if (selBg) host.style.setProperty('--ui-selection-bg', selBg);
    if (selText) host.style.setProperty('--ui-selection-text', selText);

    // corners
    st.borderRadius = this.radiusToCss(s.corners?.radius) ?? '';

    // border
    applyEdgeSize(st, 'border', s.border?.width);
    if (s.border?.style) st.borderStyle = s.border.style;

    // outline
    st.outlineWidth = this.toCssLength(s.outline?.width) ?? '';
    st.outlineOffset = this.toCssLength(s.outline?.offset) ?? '';

    // spacing
    applyEdgeSize(st, 'padding', s.spacing?.padding);
    applyEdgeSize(st, 'margin', s.spacing?.margin);
    st.gap = this.toCssLength(s.spacing?.gap) ?? '';

    const size = s.spacing?.size ?? {};
    st.width = this.toCssLength(size.w) ?? '';
    st.height = this.toCssLength(size.h) ?? '';
    st.minWidth = this.toCssLength(size.minW) ?? '';
    st.minHeight = this.toCssLength(size.minH) ?? '';
    st.maxWidth = this.toCssLength(size.maxW) ?? '';
    st.maxHeight = this.toCssLength(size.maxH) ?? '';

    // typography
    if (s.typography?.font?.family) st.fontFamily = s.typography.font.family;
    st.fontSize = this.toCssLength(s.typography?.fontSize) ?? '';
    if (s.typography?.fontWeight != null) st.fontWeight = `${s.typography.fontWeight}`;
    st.lineHeight = this.toCssLength(s.typography?.lineHeight) ?? '';
    st.letterSpacing = this.toCssLength(s.typography?.letterSpacing) ?? '';
    if (s.typography?.textTransform) st.textTransform = s.typography.textTransform;
    if (s.typography?.textAlign) st.textAlign = s.typography.textAlign;

    // effects
    if (s.effects?.shadow) st.boxShadow = toBoxShadow(s.effects.shadow);
    if (s.effects?.opacity != null) st.opacity = `${s.effects.opacity}`;

    // interactions
    if (s.interactions?.transition) {
      const props = (s.interactions.transition.properties ?? []).join(', ');
      if (props) st.transitionProperty = props;
      if (s.interactions.transition.duration != null) st.transitionDuration = `${s.interactions.transition.duration}ms`;
      if (s.interactions.transition.timing) st.transitionTimingFunction = s.interactions.transition.timing;
    }
    if (s.interactions?.cursor) st.cursor = s.interactions.cursor;
    if (s.interactions?.pointerEvents) st.pointerEvents = s.interactions.pointerEvents;
  }

  private resolveColor(ref: ColorRef): string | null {
    if (ref == null || `${ref}`.trim() === '') return null;
    const s = `${ref}`.trim();
    const tokenHit = this.theme.getTokenHex(s);
    if (tokenHit) return tokenHit;
    if (s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl')) return s;
    const palette = this.theme.resolveColor(s);
    if (palette) return palette;
    const last = s.split(/[.\s/:_-]+/).pop() || '';
    if (last) {
      const late = this.theme.resolveColor(last);
      if (late) return late;
    }
    return null;
  }

  private toCssLength(v?: CssSize): string | null {
    if (v == null) return null;
    if (typeof v === 'number') return `${v}px`;
    const s = `${v}`.trim();
    if (!s) return null;
    const tokenMaybe = this.theme.getTokenHex(s);
    if (tokenMaybe) return tokenMaybe;
    return s;
  }

  private radiusToCss(v?: UiRadiusKey | CssSize): string | null {
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
  }
}

/* helpers */
function applyEdgeSize(st: CSSStyleDeclaration, prop: 'padding' | 'margin' | 'border', val?: any) {
  if (val == null) return;
  if (typeof val === 'number' || typeof val === 'string') {
    const v = typeof val === 'number' ? `${val}px` : `${val}`;
    if (prop === 'border') st.setProperty('border-width', v);
    else st.setProperty(prop, v);
    return;
  }
  for (const [k, each] of Object.entries(val as Record<string, CssSize>)) {
    const cssVal = typeof each === 'number' ? `${each}px` : `${each}`;
    switch (k) {
      case 'x': st.setProperty(`${prop}-left`, cssVal); st.setProperty(`${prop}-right`, cssVal); break;
      case 'y': st.setProperty(`${prop}-top`, cssVal); st.setProperty(`${prop}-bottom`, cssVal); break;
      case 'top':
      case 'right':
      case 'bottom':
      case 'left': st.setProperty(`${prop}-${k}`, cssVal); break;
      case 'all': if (prop === 'border') st.setProperty('border-width', cssVal); else st.setProperty(prop, cssVal); break;
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
