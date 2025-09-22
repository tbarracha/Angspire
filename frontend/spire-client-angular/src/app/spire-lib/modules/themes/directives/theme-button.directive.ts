// theme-button.directive.ts
import {
  Directive, ElementRef, HostBinding, HostListener, Input,
  OnInit, inject, effect, signal
} from '@angular/core';
import { ThemeService } from '../theme.service';
import type { Style } from '../theme';

type Spec = { variant: Style; bg: string | null; fg: string | null };

@Directive({
  selector: '[themeButton]',
  standalone: true,
})
export class ThemeButtonDirective implements OnInit {
  private el = inject(ElementRef<HTMLElement>);
  private theme = inject(ThemeService);

  /** ui-style="solid primary primary-content" */
  @Input('ui-style') uiStyleSpec: string | null = null;
  /** ui-hover-style="dashed accent primary-content" */
  @Input('ui-hover-style') uiHoverStyleSpec: string | null = null;

  /** Optional metrics */
  @Input() radius: string | number | null = 'md';       // token or CSS length
  @Input() ringWidth: string | number | null = 'focus'; // token or CSS length
  @Input() borderWidth: string | number | null = 'base';

  // internal hover/active/focus (can be extended later if needed)
  private _hov = signal(false);
  private _act = signal(false);
  private _foc = signal(false);

  // CSS vars (Tailwind-safe)
  @HostBinding('style.--ui-bg')           bgVar: string | null = null;
  @HostBinding('style.--ui-fg')           fgVar: string | null = null;
  @HostBinding('style.--ui-border')       borderVar: string | null = null;
  @HostBinding('style.--ui-border-style') borderStyleVar: string | null = null;
  @HostBinding('style.--ui-ring')         ringVar: string | null = null;
  @HostBinding('style.--ui-shadow')       shadowVar: string | null = null;
  @HostBinding('style.--ui-radius')       radiusVar: string | null = null;
  @HostBinding('style.--ui-ring-w')       ringWVar: string | null = null;
  @HostBinding('style.--ui-border-w')     borderWVar: string | null = null;

  ngOnInit() {
    effect(() => {
      // react to theme animations
      void this.theme.animationTick();

      // Pick spec by state (hover wins over idle; you can add active/focus later)
      const hovered = this._hov();
      const idleSpec = this.parseSpec(this.uiStyleSpec) ?? { variant: 'solid', bg: 'primary', fg: null };
      const hovSpec  = this.parseSpec(this.uiHoverStyleSpec) ?? null;
      const spec = hovered && hovSpec ? hovSpec : idleSpec;

      // Resolve color pair
      const bg = this.resolveColor(spec.bg);
      const fg = this.resolveFg(spec, bg);

      // Map variant → CSS vars
      this.applyVariant(spec.variant, bg, fg);

      // Metrics
      this.radiusVar = this.theme.resolveSize('radius', this.radius);
      this.ringWVar  = this.theme.resolveSize('ringWidth', this.ringWidth);
      this.borderWVar= this.theme.resolveSize('borderWidth', this.borderWidth);
    });
  }

  // Hover / active / focus tracking (kept minimal per your ask)
  @HostListener('mouseenter') onEnter(){ this._hov.set(true); }
  @HostListener('mouseleave') onLeave(){ this._hov.set(false); this._act.set(false); }
  @HostListener('mousedown')  onDown() { this._act.set(true); }
  @HostListener('mouseup')    onUp()   { this._act.set(false); }
  @HostListener('focusin')    onFocus(){ this._foc.set(true); }
  @HostListener('focusout')   onBlur() { this._foc.set(false); }

  // ---- helpers
  private parseSpec(raw: string | null): Spec | null {
    if (!raw) return null;
    const parts = raw.trim().split(/\s+/);
    const variant = (parts[0] as Style) ?? 'solid';
    const bg = parts[1] ?? null;
    const fg = parts[2] ?? null;
    return { variant, bg, fg };
  }

  private resolveColor(token: string | null): string | null {
    return token ? this.theme.resolve(token) : null;
  }

  private resolveFg(spec: Spec, resolvedBg: string | null): string | null {
    // Prefer explicit fg token (spec.fg), else try "<bg>-content" / "-contrast", else auto-contrast
    if (spec.fg) return this.theme.resolve(spec.fg);
    if (spec.bg) {
      const pair =
        this.theme.resolve(`${spec.bg}-content`) ??
        this.theme.resolve(`${spec.bg}-contrast`);
      if (pair) return pair;
    }
    return this.theme.resolveAutoContrastFor(resolvedBg);
  }

  private applyVariant(variant: Style, bg: string | null, fg: string | null) {
    // defaults
    let bgV: string | null = 'transparent';
    let fgV: string | null = fg ?? 'inherit';
    let borderV: string | null = 'transparent';
    let borderStyle: 'solid'|'dashed'|'none' = 'none';
    let ringV: string | null = 'transparent';
    let shadowV: string | null = 'transparent';

    if (variant === 'solid') {
      bgV = bg;
      fgV = fg ?? this.theme.resolveAutoContrastFor(bg);
    } else if (variant === 'soft') {
      bgV = lighten(bg, 0.15);
      fgV = fg ?? this.theme.resolveAutoContrastFor(bgV);
    } else if (variant === 'outline') {
      bgV = 'transparent';
      borderV = fgV;
      borderStyle = 'solid';
    } else if (variant === 'dashed') {
      bgV = 'transparent';
      borderV = fgV;
      borderStyle = 'dashed';
    } else if (variant === 'ghost') {
      bgV = 'transparent';
      borderStyle = 'none';
    }

    // Reuse fg for ring by default; easy to change later
    ringV = fgV;

    this.bgVar = bgV;
    this.fgVar = fgV;
    this.borderVar = borderV;
    this.borderStyleVar = borderStyle;
    this.ringVar = ringV;
    this.shadowVar = shadowV;
  }
}

// lightening helper
function lighten(hexOrRgb: string | null, amt = 0.15): string | null {
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
