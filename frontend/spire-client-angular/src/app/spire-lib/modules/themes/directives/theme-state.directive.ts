// theme-state.directive.ts
import {
  Directive, Input, ElementRef, Renderer2, inject,
  HostListener, DestroyRef, effect, Injector
} from '@angular/core';
import { ThemeService } from '../theme.service';
import { ThemePresetBus } from './theme-preset.bus';

type Maybe = string | string[] | null | undefined;
type StyleKind = 'soft' | 'outline' | 'dashed' | 'ghost';

export interface ThemeSpec {
  classes?: string | string[];

  /** Optional preset like: 'outline primary', 'ghost accent', 'soft error', 'dashed info' */
  style?: string;

  /** Colors (tokens or literals) */
  bg?: string | null;
  fg?: string | null;
  border?: string | null;
  ring?: boolean; // focus ring using border|fg|bg|accent

  /** Border/ring style & sizes (tokens or literal CSS lengths) */
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  radius?: string | number | null;
  borderW?: string | number | null;
  ringW?: string | number | null;
}

@Directive({
  selector: '[themeState]',
  standalone: true,
  providers: [ThemePresetBus],
})
export class ThemeStateDirective {
  private injector = inject(Injector);
  private el = inject(ElementRef<HTMLElement>).nativeElement;
  private r = inject(Renderer2);
  private theme = inject(ThemeService);
  private destroyRef = inject(DestroyRef);

  @Input('base') base?: Maybe | ThemeSpec;
  @Input('hover') hover?: Maybe | ThemeSpec;
  @Input('focus') focus?: Maybe | ThemeSpec;
  @Input('active') active?: Maybe | ThemeSpec;

  /** Style spec applied when disabled is true */
  @Input('disabledSpec') disabledSpec?: Maybe | ThemeSpec;

  /** For non-native controls (divs, custom elements). Does not set DOM disabled. */
  @Input('stateDisabled') stateDisabled?: boolean | '' | 'true' | 'false' | null = null;

  private appliedClassSet = new Set<string>();
  private isHovered = false;
  private isFocused = false;
  private isActive  = false;

  constructor() {
    // Re-apply whenever current theme changes OR the animation advances
    const e = effect(() => {
      this.theme.currentTheme();   // track committed theme
      this.theme.animationTick();  // track lerp frames
      this.apply();
    }, { injector: this.injector });

    this.destroyRef.onDestroy(() => e.destroy());
  }

  ngOnInit() { this.apply(); }

  // Ignore hover/active state updates when disabled
  @HostListener('mouseenter') onEnter() { if (this.isDisabled()) return; this.isHovered = true; this.apply(); }
  @HostListener('mouseleave') onLeave()  { if (this.isDisabled()) return; this.isHovered = false; this.isActive = false; this.apply(); }
  @HostListener('focusin')    onFocus()  { if (this.isDisabled()) return; this.isFocused = true; this.apply(); }
  @HostListener('focusout')   onBlur()   { if (this.isDisabled()) return; this.isFocused = false; this.isActive = false; this.apply(); }
  @HostListener('mousedown')  onDown()   { if (this.isDisabled()) return; this.isActive = true; this.apply(); }
  @HostListener('mouseup')    onUp()     { if (this.isDisabled()) return; this.isActive = false; this.apply(); }
  @HostListener('keydown.enter') onKey() { if (this.isDisabled()) return; this.isActive = true; this.apply(); setTimeout(()=>{ this.isActive=false; this.apply(); }); }

  refresh() { this.apply(); }

  private apply() {
    const spec = this.pickSpec();

    // classes
    for (const c of this.appliedClassSet) this.r.removeClass(this.el, c);
    this.appliedClassSet.clear();
    for (const c of toClassArray(spec.classes)) {
      this.r.addClass(this.el, c);
      this.appliedClassSet.add(c);
    }

    // reset styles we control
    const set = (k: string, v: string | null) => this.r.setStyle(this.el, k, v);
    set('backgroundColor', null);
    set('color', null);
    set('borderColor', null);
    set('borderStyle', null);
    set('borderWidth', null);
    set('borderRadius', null);
    set('boxShadow', null);
    set('outline', null);

    // colors
    const bg = this.theme.resolve(spec.bg ?? null);
    const fg = this.theme.resolve(spec.fg ?? null) ?? this.theme.resolveAutoContrastFor(spec.bg ?? null);
    const br = this.theme.resolve(spec.border ?? null);

    if (bg) set('backgroundColor', bg);
    if (fg) set('color', fg);
    if (br) set('borderColor', br);

    // ---- metrics: border style / width / radius ----
    // width: if caller gave a token/length, use it; else if a border color exists, default to 'hairline'
    const borderWExplicit = this.theme.resolveSize('borderWidth', spec.borderW ?? null);
    const borderWDefault  = br ? this.theme.resolveSize('borderWidth', 'hairline') : null;
    const borderW         = borderWExplicit ?? borderWDefault;

    // style: if any border indication, default to 'solid' (unless explicit)
    if (spec.borderStyle) set('borderStyle', spec.borderStyle);
    else if (br || borderW) set('borderStyle', 'solid');

    if (borderW) set('borderWidth', borderW);

    // radius: respect Tailwind rounded-* classes if present.
    // If caller/preset specified a radius token/length, apply it unless the element already has a rounded-* class.
    const wantsRadius = spec.radius !== undefined; // present either explicitly or via preset
    const radiusVal = this.theme.resolveSize('radius', spec.radius ?? null);
    if (wantsRadius && radiusVal && !hasRoundedClass(this.el)) {
      set('borderRadius', radiusVal);
    }

    // ring
    const ringActive = !this.isDisabled() && (spec.ring === true || (this.isFocused && spec.ring !== false));
    if (ringActive) {
      const ringCandidate = spec.border ?? spec.fg ?? spec.bg ?? 'accent';
      const ringColor = this.theme.resolve(ringCandidate) ?? '#60a5fa';
      const ringW = this.theme.resolveSize('ringWidth', spec.ringW ?? 'focus') ?? '2px';
      set('boxShadow', `0 0 0 ${ringW} ${ringColor}`);
    }
  }

  private pickSpec(): ThemeSpec {
    const b = normalizeSpec(this.base, this.theme);

    // Disabled wins over all other states
    if (this.isDisabled()) {
      return mergeSpec(b, normalizeSpec(this.disabledSpec, this.theme));
    }

    if (this.isActive)  return mergeSpec(
      b,
      normalizeSpec(this.hover, this.theme),
      normalizeSpec(this.focus, this.theme),
      normalizeSpec(this.active, this.theme)
    );
    if (this.isFocused) return mergeSpec(
      b,
      normalizeSpec(this.hover, this.theme),
      normalizeSpec(this.focus, this.theme)
    );
    if (this.isHovered) return mergeSpec(
      b,
      normalizeSpec(this.hover, this.theme)
    );
    return b;
  }

  /** Effective disabled: native [disabled], aria-disabled="true", or stateDisabled flag */
  private isDisabled(): boolean {
    if (this.el.hasAttribute('disabled')) return true;
    const aria = (this.el.getAttribute('aria-disabled') || '').toLowerCase();
    if (aria === 'true') return true;
    return coerceBoolean(this.stateDisabled);
  }
}

/* ---------------- helpers ---------------- */
function toClassArray(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : v.split(/\s+/g).filter(Boolean);
}

/** Expand style presets into a concrete ThemeSpec, then merge with explicit fields (explicit wins). */
function normalizeSpec(input?: Maybe | ThemeSpec, theme?: ThemeService): ThemeSpec {
  if (!input) return {};
  if (typeof input === 'string' || Array.isArray(input)) return { classes: input };

  const spec = { ...input };
  const styleSpec = input.style && theme ? expandStyle(input.style, theme) : {};
  // explicit fields override preset-derived values
  return mergeSpec(styleSpec, stripStyle(spec));
}
function stripStyle(s: ThemeSpec): ThemeSpec {
  const { style, ...rest } = s;
  return rest;
}
function mergeSpec(...all: ThemeSpec[]): ThemeSpec {
  const out: ThemeSpec = {};
  const classes: string[] = [];
  for (const s of all) {
    if (!s) continue;
    if (s.classes) classes.push(...toClassArray(s.classes));
    if (s.bg !== undefined) out.bg = s.bg;
    if (s.fg !== undefined) out.fg = s.fg;
    if (s.border !== undefined) out.border = s.border;
    if (s.ring !== undefined) out.ring = s.ring;
    if (s.borderStyle !== undefined) out.borderStyle = s.borderStyle;
    if (s.radius !== undefined) out.radius = s.radius;
    if (s.borderW !== undefined) out.borderW = s.borderW;
    if (s.ringW !== undefined) out.ringW = s.ringW;
  }
  if (classes.length) out.classes = classes;
  return out;
}

function coerceBoolean(v: any): boolean {
  return v === '' || v === true || v === 'true';
}

/* Tailwind guard: if developer already used rounded-* classes, don't override with inline radius */
function hasRoundedClass(el: HTMLElement): boolean {
  for (const cls of Array.from(el.classList)) {
    if (cls === 'rounded' || cls.startsWith('rounded-')) return true;
  }
  return false;
}

/* ---------------- style presets ---------------- */
function expandStyle(style: string, theme: ThemeService): ThemeSpec {
  const parts = style.trim().split(/\s+/);
  const kind = (parts[0]?.toLowerCase() as StyleKind) || 'outline';
  const colorToken = parts[1] || 'primary';

  // Convenience resolvers with safe fallbacks
  const resolve = (t: string | null) => (t ? theme.resolve(t) : null);
  const resolveOr = (t: string, fallback: string | null) => {
    const v = resolve(t);
    return isCssColor(v) ? (v as string) : fallback;
  };
  const contentOf = (t: string) => resolveOr(`${t}-content`, null);
  const lightOf   = (t: string) => resolveOr(`${t}-light`, null);

  // default radius for presets uses theme metrics; actual application respects rounded-* classes
  const presetRadius: ThemeSpec['radius'] = 'md';

  if (kind === 'outline') {
    const bg = resolveOr(colorToken, null);
    const content = contentOf(colorToken) ?? (bg ? theme.resolveAutoContrastFor(bg) : null);
    return {
      bg: bg ?? undefined,
      fg: content ?? undefined,
      border: content ?? undefined,
      borderW: 'hairline',
      borderStyle: 'solid',
      radius: presetRadius,
    };
  }

  if (kind === 'dashed') {
    const color = resolveOr(colorToken, null) ?? contentOf(colorToken) ?? '#999';
    return {
      bg: 'transparent',
      fg: color,
      border: color,
      borderW: 'hairline',
      borderStyle: 'dashed',
      radius: presetRadius,
    };
  }

  if (kind === 'ghost') {
    const color = resolveOr(colorToken, null) ?? contentOf(colorToken) ?? '#666';
    return {
      bg: 'transparent',
      fg: color,
      borderStyle: 'none',
      borderW: 0,
      radius: presetRadius,
    };
  }

  // soft
  const softBg = lightOf(colorToken) ?? resolveOr(colorToken, null);
  const softFg = contentOf(colorToken) ?? (softBg ? theme.resolveAutoContrastFor(softBg) : null);
  return {
    bg: softBg ?? undefined,
    fg: softFg ?? undefined,
    border: softBg ?? undefined,
    borderW: 'hairline',
    borderStyle: 'solid',
    radius: presetRadius,
  };
}

/** Basic color literal detection (hex/rgb/hsl/transparent). */
function isCssColor(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s === 'transparent' || s === 'currentcolor') return true;
  if (s.startsWith('#')) return true;
  if (/^rgba?\(/i.test(s)) return true;
  if (/^hsla?\(/i.test(s)) return true;
  return false;
}
