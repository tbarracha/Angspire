// theme.service.ts
import { Injectable, Inject, signal, computed, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Theme } from './theme';

const DEFAULT_METRICS = {
  radius: {
    xm:  '0.125rem',
    sm:  '0.25rem',
    md:  '0.5rem',
    lg:  '0.75rem',
    xlg: '1rem',
    pill:'9999px',
  },
  borderWidth: {
    none: '0',
    hairline: '1px',
    base: '2px',
    thick: '3px',
  },
  ringWidth: {
    none: '0',
    subtle: '1px',
    focus: '2px',
    strong: '3px',
  },
} as const;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  static readonly themeChanged: EventEmitter<Theme> = new EventEmitter<Theme>();

  private root: HTMLElement;
  private themes: Theme[] = [];

  private readonly current = signal<Theme | null>(null);
  private readonly animFrameColors = signal<Record<string, string> | null>(null);
  private readonly animTick = signal(0);
  private rafId: number | null = null;

  readonly currentTheme = computed(() => this.current());
  readonly isDark = computed(() => (this.current()?.name ?? '').toLowerCase().includes('dark'));
  readonly animationTick = computed(() => this.animTick());

  private themesUrl!: string;

  constructor(
    private http: HttpClient,
    @Inject(DOCUMENT) private doc: Document
  ) {
    this.root = this.doc.documentElement;
    // If you store in /assets, change to 'assets/themes.json'
    this.themesUrl = new URL('themes.json', this.doc.baseURI).toString();
    this.loadThemes();
  }

  loadThemes(): void {
    this.http.get<Theme[]>(this.themesUrl).subscribe({
      next: (themes) => {
        this.themes = themes ?? [];
        const savedName = this.loadSavedName();
        const initial = (savedName && this.findByName(savedName)) || this.themes[0] || null;
        if (initial) this.applyTheme(initial, false);
        else console.warn('[ThemeService] No themes available to apply.');
      },
      error: (err) => console.error('[ThemeService] Failed to load themes:', err),
    });
  }

  getAllThemes(): Theme[] { return this.themes; }

  applyThemeByName(name: string, save = true) {
    const t = this.findByName(name);
    if (!t) return console.error('[ThemeService] Theme not found:', name);
    this.applyTheme(t, save);
  }

  applyLerpedThemeByName(name: string, duration = 200, save = true) {
    const t = this.findByName(name);
    if (!t) return console.error('[ThemeService] Theme not found:', name);
    this.applyLerpedTheme(t, duration, save);
  }

  /** Instant switch (cancels any active animation). */
  applyTheme(theme: Theme, save = true) {
    this.cancelAnimation();
    this.current.set(theme);
    this.animFrameColors.set(null);
    this.root.setAttribute('data-theme', theme.name);
    if (save) localStorage.setItem('currentThemeName', theme.name);
    ThemeService.themeChanged.emit(theme);
  }

  /** Smoothly lerp all known tokens between current → next over duration (ms). */
  applyLerpedTheme(theme: Theme, duration = 200, save = true) {
    const from = this.current() ?? theme;
    const to = theme;

    const keys = new Set<string>([
      ...Object.keys(from.colors || {}),
      ...Object.keys(to.colors || {}),
    ]);

    const fromRGB: Record<string, [number, number, number]> = {};
    const toRGB: Record<string, [number, number, number]> = {};
    for (const k of keys) {
      fromRGB[k] = parseRgbAny((from.colors && from.colors[k]) || '#000');
      toRGB[k]   = parseRgbAny((to.colors   && to.colors[k])   || '#000');
    }

    this.root.setAttribute('data-theme', to.name);
    const start = performance.now();
    this.cancelAnimation();

    const step = (now: number) => {
      const t = Math.min((now - start) / Math.max(1, duration), 1);
      const frame: Record<string, string> = {};
      for (const k of keys) {
        const [r1, g1, b1] = fromRGB[k];
        const [r2, g2, b2] = toRGB[k];
        const r = Math.round(lerp(r1, r2, t));
        const g = Math.round(lerp(g1, g2, t));
        const b = Math.round(lerp(b1, b2, t));
        frame[k] = `rgb(${r}, ${g}, ${b})`;
      }
      this.animFrameColors.set(frame);
      this.animTick.set(this.animTick() + 1);

      if (t < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.animFrameColors.set(null);
        this.current.set(to);
        if (save) localStorage.setItem('currentThemeName', to.name);
        this.rafId = null;
        this.animTick.set(this.animTick() + 1);
        ThemeService.themeChanged.emit(to);
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  /** Resolve token-or-literal to a concrete color. During animation, returns the in-flight color. */
  resolve(tokenOrColor: string | null | undefined): string | null {
    if (!tokenOrColor) return null;
    if (isLiteralColor(tokenOrColor)) return tokenOrColor;

    const frame = this.animFrameColors();
    if (frame && tokenOrColor in frame) return frame[tokenOrColor];

    const t = this.current();
    if (t && t.colors[tokenOrColor]) return t.colors[tokenOrColor];

    return tokenOrColor;
  }

  /** If fg not provided, try "<bg>-contrast" → "<bg>-text" → auto contrast. */
  resolveAutoContrastFor(bgTokenOrColor: string | null | undefined): string | null {
    const base = this.resolve(bgTokenOrColor);
    if (!base) return null;

    const key = String(bgTokenOrColor ?? '');
    const frame = this.animFrameColors();
    if (frame) {
      const fc = frame[`${key}-contrast`] ?? frame[`${key}-text`];
      if (fc) return fc;
    }
    const t = this.current();
    if (t) {
      const tc = t.colors[`${key}-contrast`] ?? t.colors[`${key}-text`];
      if (tc) return tc;
    }

    const { r, g, b } = parseAnyColor(base);
    const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    return lum > 0.6 ? '#111' : '#fff';
  }

  /** Resolve metrics token or CSS length; falls back to DEFAULT_METRICS when theme omits it. */
  resolveSize(
    category: 'radius' | 'borderWidth' | 'ringWidth',
    tokenOrLength: string | number | null | undefined
  ): string | null {
    if (tokenOrLength == null) return null;
    if (typeof tokenOrLength === 'number') return `${tokenOrLength}px`;

    const raw = `${tokenOrLength}`.trim();
    if (isLiteralLength(raw)) return raw;

    const themeMap = this.current()?.metrics?.[category] ?? {};
    const defaultMap = (DEFAULT_METRICS as any)[category] as Record<string, string>;

    if (raw in themeMap)   return themeMap[raw];
    if (raw in defaultMap) return defaultMap[raw];

    // let unknown tokens pass through (e.g., 'max-content', custom CSS keywords)
    return raw;
  }

  /** Optional convenience: direct metric lookup with default fallback. */
  metric(category: 'radius' | 'borderWidth' | 'ringWidth', token: string): string | null {
    return this.resolveSize(category, token);
  }

  /* helpers */
  private findByName(name: string): Theme | undefined {
    const n = (name ?? '').toLowerCase();
    return this.themes.find(t => (t.name ?? '').toLowerCase() === n);
  }

  private loadSavedName(): string | null {
    const s = localStorage.getItem('currentThemeName');
    return s && s.trim().length ? s : null;
  }

  private cancelAnimation() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.animFrameColors.set(null);
  }
}

/* color utils */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function parseRgbAny(c: string): [number, number, number] {
  const s = c.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  return [0, 0, 0];
}
function parseAnyColor(c: string): { r: number; g: number; b: number } {
  const [r, g, b] = parseRgbAny(c);
  return { r, g, b };
}
function isLiteralColor(x: string): boolean {
  if (x.startsWith('#')) return true;
  if (/^rgba?\(/i.test(x)) return true;
  if (/^hsl[a]?\(/i.test(x)) return true;
  return false;
}
function isLiteralLength(v: string): boolean {
  // px, rem, em, %, vw, vh, ch, ex, cm, mm, in, pt, pc, q
  return /^-?\d*\.?\d+(px|r?em|%|vw|vh|ch|ex|cm|mm|in|pt|pc|q)$/i.test(v);
}
