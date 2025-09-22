// ui-style-state.directive.ts
import {
  Directive, ElementRef, HostBinding, HostListener,
  Input, OnInit, OnDestroy, inject, signal, effect
} from '@angular/core';
import { Style } from '../theme';
import { ThemeService } from '../theme.service';

type StateKey = 'idle'|'hovered'|'active'|'focused'|'disabled';

interface StyleSpec {
  style: Style;        // 'solid' | 'soft' | 'outline' | 'dashed' | 'ghost'
  color: string;       // token or literal for background (uses `${color}-content` for fg/border)
}

@Directive({
  selector: '[uiStyleState]',
  standalone: true,
})
export class UiStyleStateDirective implements OnInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private theme = inject(ThemeService);

  // ---- Default (fallback) style/color if state-specific ones aren’t provided
  @Input() styleDefault: Style | null = 'solid';
  @Input() colorDefault: string | null = 'primary';

  // ---- Per-state overrides (each requires its own color pair)
  @Input() idleStyle:    Style | null = null;
  @Input() idleColor:    string | null = null;

  @Input() hoveredStyle: Style | null = null;
  @Input() hoveredColor: string | null = null;

  @Input() activeStyle:  Style | null = null;
  @Input() activeColor:  string | null = null;

  @Input() focusedStyle: Style | null = null;
  @Input() focusedColor: string | null = null;

  @Input() disabledStyle: Style | null = null;
  @Input() disabledColor: string | null = null;

  // ---- Optional metrics
  @Input() radiusToken: string | number | null = null;
  @Input() ringWidthToken: string | number | null = null;
  @Input() borderWidthToken: string | number | null = null;

  // ---- External state overrides (else auto from listeners)
  @Input() isHovered: boolean | null = null;
  @Input() isActive:  boolean | null = null;
  @Input() isFocused: boolean | null = null;
  @Input() isDisabled:boolean | null = null;

  // Internal signals for auto state
  private _hov = signal(false);
  private _act = signal(false);
  private _foc = signal(false);
  private _dis = signal(false);

  // CSS variable HostBindings (keep Tailwind purge-safe)
  @HostBinding('style.--ui-bg')           bgVar: string | null = null;
  @HostBinding('style.--ui-fg')           fgVar: string | null = null;
  @HostBinding('style.--ui-border')       borderVar: string | null = null;
  @HostBinding('style.--ui-border-style') borderStyleVar: string | null = null; // 'solid' | 'dashed' | 'none'
  @HostBinding('style.--ui-ring')         ringVar: string | null = null;
  @HostBinding('style.--ui-shadow')       shadowVar: string | null = null;

  @HostBinding('style.--ui-radius')       radiusVar: string | null = null;
  @HostBinding('style.--ui-ring-w')       ringWVar: string | null = null;
  @HostBinding('style.--ui-border-w')     borderWVar: string | null = null;

  // For debugging / targeting
  @HostBinding('attr.data-style-state') get dataStyleState() { return this.currentState(); }

  ngOnInit() {
    effect(() => {
      // react to theme animation ticks to keep lerps smooth
      void this.theme.animationTick();

      const s = this.currentState();
      const spec = this.pickSpecFor(s);

      // Validate: each style must have a color pair
      const color = spec.color ?? this.colorDefault ?? 'primary';
      const fgTok = `${color}-content`;

      // Resolve pair (with contrast fallback)
      const bg = this.resolveColor(color);
      const fg = this.resolveContent(color) ?? this.theme.resolveAutoContrastFor(bg);

      // Map style → CSS vars for this state
      const borderColor = this.resolveContent(color) ?? fg;
      const ringColor   = borderColor;

      const variant = spec.style ?? this.styleDefault ?? 'solid';
      this.applyVariant(variant, { bg, fg, border: borderColor, ring: ringColor });

      // Metrics
      this.radiusVar = this.theme.resolveSize('radius', this.radiusToken);
      this.ringWVar  = this.theme.resolveSize('ringWidth', this.ringWidthToken);
      this.borderWVar= this.theme.resolveSize('borderWidth', this.borderWidthToken);
    });
  }

  ngOnDestroy() {}

  // --------- Listeners for auto states
  @HostListener('mouseenter') onEnter(){ if (this.isHovered==null) this._hov.set(true); }
  @HostListener('mouseleave') onLeave(){ if (this.isHovered==null) { this._hov.set(false); this._act.set(false);} }
  @HostListener('mousedown')  onDown() { if (this.isActive ==null) this._act.set(true); }
  @HostListener('mouseup')    onUp()   { if (this.isActive ==null) this._act.set(false); }
  @HostListener('focusin')    onFocus(){ if (this.isFocused==null) this._foc.set(true); }
  @HostListener('focusout')   onBlur() { if (this.isFocused==null) this._foc.set(false); }

  // --------- Helpers
  private currentState(): StateKey {
    const hovered = this.isHovered ?? this._hov();
    const active  = this.isActive  ?? this._act();
    const focused = this.isFocused ?? this._foc();
    const disabled= this.isDisabled?? this._dis();

    if (disabled) return 'disabled';
    if (active)   return 'active';
    if (hovered)  return 'hovered';
    if (focused)  return 'focused';
    return 'idle';
  }

  private pickSpecFor(state: StateKey): StyleSpec {
    const fallback: StyleSpec = {
      style: this.styleDefault ?? 'solid',
      color: this.colorDefault ?? 'primary',
    };

    switch (state) {
      case 'idle':    return { style: this.idleStyle    ?? fallback.style, color: this.idleColor    ?? fallback.color };
      case 'hovered': return { style: this.hoveredStyle ?? fallback.style, color: this.hoveredColor ?? fallback.color };
      case 'active':  return { style: this.activeStyle  ?? fallback.style, color: this.activeColor  ?? fallback.color };
      case 'focused': return { style: this.focusedStyle ?? fallback.style, color: this.focusedColor ?? fallback.color };
      case 'disabled':return { style: this.disabledStyle?? fallback.style, color: this.disabledColor?? fallback.color };
      default:        return fallback;
    }
  }

  private resolveColor(token: string | null): string | null {
    if (!token) return null;
    return this.theme.resolve(token);
  }
  private resolveContent(token: string | null): string | null {
    if (!token) return null;
    // try `${token}-content`, then `${token}-contrast`
    return this.theme.resolve(`${token}-content`) ?? this.theme.resolve(`${token}-contrast`);
  }

  private applyVariant(variant: Style, colors: { bg: string|null; fg: string|null; border: string|null; ring: string|null; }) {
    const { bg, fg, border, ring } = colors;

    // Defaults
    let bgV: string|null = 'transparent';
    let fgV: string|null = fg ?? 'inherit';
    let borderV: string|null = 'transparent';
    let borderStyle: 'solid'|'dashed'|'none' = 'none';
    let ringV: string|null = 'transparent';
    let shadowV: string|null = 'transparent';

    if (variant === 'solid') {
      bgV = bg;
      fgV = fg ?? this.theme.resolveAutoContrastFor(bg);
      borderStyle = 'none';
    } else if (variant === 'soft') {
      bgV = lighten(bg, 0.15);
      fgV = fg ?? this.theme.resolveAutoContrastFor(bgV);
      borderStyle = 'none';
    } else if (variant === 'outline') {
      bgV = 'transparent';
      fgV = fg ?? this.theme.resolveAutoContrastFor(bg);
      borderV = border ?? fgV;
      borderStyle = 'solid';
    } else if (variant === 'dashed') {
      bgV = 'transparent';
      fgV = fg ?? this.theme.resolveAutoContrastFor(bg);
      borderV = border ?? fgV;
      borderStyle = 'dashed';
    } else if (variant === 'ghost') {
      bgV = 'transparent';
      fgV = fg ?? this.theme.resolveAutoContrastFor(bg);
      borderStyle = 'none';
    }

    // Focus ring color (only meaningful when 'focused' state is active; we provide color always)
    ringV = ring ?? border ?? fgV;

    this.bgVar = bgV;
    this.fgVar = fgV;
    this.borderVar = borderV;
    this.borderStyleVar = borderStyle;
    this.ringVar = ringV;
    this.shadowVar = shadowV;
  }
}

// Helpers
function lighten(hexOrRgb: string|null, amt: number): string|null {
  if (!hexOrRgb) return null;
  const s = hexOrRgb.trim();
  const [r,g,b] = s.startsWith('#') ? hexToRgb(s) : rgbToTuple(s);
  const L = (x:number)=>Math.round(x + (255 - x)*amt);
  return `rgb(${clamp(L(r))}, ${clamp(L(g))}, ${clamp(L(b))})`;
}
function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace('#','');
  const full = h.length===3 ? h.split('').map(c=>c+c).join('') : h;
  const n = parseInt(full,16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function rgbToTuple(rgb: string): [number,number,number] {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return m ? [+m[1], +m[2], +m[3]] : [0,0,0];
}
function clamp(n:number){ return Math.max(0, Math.min(255, n)); }
