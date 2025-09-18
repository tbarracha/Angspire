import { Injectable, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Theme } from './theme';

type Hex = string; // e.g., "#fff", "#ffffff", "#ffffffff", or "rgb(...)"

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private root: HTMLElement;
  private themes: Theme[] = [];
  private currentTheme?: Theme;

  // rAF handle per css var name to cancel/replace in-flight animations
  private activeAnims = new Map<string, number>();

  /** Emitted whenever the active theme object changes OR its contents are re-applied. */
  static readonly themeChanged = new EventEmitter<Theme>();
  /** Emitted whenever the themes list reference changes (add/remove/update/import). */
  static readonly themesChanged = new EventEmitter<Theme[]>();

  private themesUrl!: string;

  /** Back-compat flag: export palette entries as CSS variables on apply. */
  private useCssVariables = true;

  constructor(private http: HttpClient, @Inject(DOCUMENT) private doc: Document) {
    this.root = this.doc.documentElement;
    this.themesUrl = new URL('themes.json', this.doc.baseURI).toString();
    this.loadThemes();
  }

  /* =========================================================
   * Public API
   * ========================================================= */

  /** Toggle exporting palette to CSS variables; keep true during migration, set false to go full-token. */
  setExportCssVariables(enabled: boolean) {
    this.useCssVariables = !!enabled;
    // re-apply current to honor new setting
    if (this.currentTheme) this.applyTheme(this.currentTheme, false);
  }

  loadThemes(): void {
    this.http.get<Theme[]>(this.themesUrl).subscribe({
      next: (themes) => {
        this.themes = Array.isArray(themes) ? themes.slice() : [];
        const savedName = this.loadSavedThemeName();
        const initial = (savedName && this.findByName(savedName)) || this.themes[0];

        if (initial) this.applyTheme(initial, false);
        else console.warn('[ThemeService] No themes available to apply.');

        if (initial?.name) this.saveCurrentThemeName(initial.name);
        ThemeService.themesChanged.emit(this.cloneList());
      },
      error: (error) => console.error('[ThemeService] Failed to load themes:', error),
    });
  }

  /** Copy to avoid external mutation. */
  getAllThemes(): Theme[] { return this.cloneList(); }

  /** Clone to avoid external mutation. */
  getCurrentTheme(): Theme | null { return this.currentTheme ? this.cloneTheme(this.currentTheme) : null; }

  isDarkMode(): boolean { return (this.currentTheme?.name ?? '').toLowerCase() === 'dark'; }

  toggleDarkMode(): void {
    const next = this.isDarkMode() ? 'light' : 'dark';
    this.applyThemeByName(next);
  }

  applyThemeByIndex(index: number): void {
    const theme = this.themes[index];
    if (theme) this.applyTheme(theme, true);
    else console.error('[ThemeService] Theme not found:', index);
  }

  applyThemeByName(themeName: string): void {
    const theme = this.findByName(themeName);
    if (theme) this.applyTheme(theme, true);
    else console.error('[ThemeService] Theme not found:', themeName);
  }

  applyThemeSmoothByIndex(index: number, duration = 200): void {
    const theme = this.themes[index];
    if (theme) this.applyThemeSmooth(theme, duration);
    else console.error('[ThemeService] Theme not found:', index);
  }

  applyThemeSmoothByName(themeName: string, duration = 200): void {
    const theme = this.findByName(themeName);
    if (theme) this.applyThemeSmooth(theme, duration);
    else console.error('[ThemeService] Theme not found:', themeName);
  }

  setThemes(themes: Theme[]) {
    this.themes = Array.isArray(themes) ? themes.slice() : [];
    this.emitThemesChanged();
  }

  addTheme(t: Theme) {
    if (!t?.name || !t?.colors) return;
    if (this.findByName(t.name)) { console.warn('[ThemeService] Theme exists:', t.name); return; }
    this.themes.push(this.cloneTheme(t));
    this.emitThemesChanged();
  }

  /** Replace by name (case-insensitive). Syncs current if it matches previous name. */
  updateTheme(name: string, next: Theme) {
    const idx = this.themes.findIndex(x => (x.name ?? '').toLowerCase() === (name ?? '').toLowerCase());
    if (idx < 0) return;

    const nextClone = this.cloneTheme(next);
    this.themes[idx] = nextClone;

    const isCurrent = (this.currentTheme?.name ?? '').toLowerCase() === (name ?? '').toLowerCase();
    if (isCurrent) {
      // keep the same object reference semantics: re-apply to CSS/export and notify
      this.currentTheme = nextClone;
      this.applyPaletteToCss(this.currentTheme); // even if useCssVariables=false, this will no-op
      this.root.setAttribute('data-theme', this.currentTheme.name);
      this.saveCurrentThemeName(this.currentTheme.name);
      ThemeService.themeChanged.emit(this.cloneTheme(this.currentTheme));
    }

    this.emitThemesChanged();
  }

  /** Safer rename that avoids duplicates. */
  renameTheme(oldName: string, newName: string): boolean {
    const srcIdx = this.themes.findIndex(t => (t.name ?? '').toLowerCase() === (oldName ?? '').toLowerCase());
    if (srcIdx < 0) return false;
    const normalized = (newName ?? '').trim();
    if (!normalized) return false;
    const dup = this.findByName(normalized);
    if (dup && dup !== this.themes[srcIdx]) return false;

    const next = { ...this.themes[srcIdx], name: normalized };
    this.updateTheme(oldName, next);
    return true;
  }

  deleteTheme(name: string) {
    const wasCurrent = (this.currentTheme?.name ?? '').toLowerCase() === (name ?? '').toLowerCase();
    this.themes = this.themes.filter(x => (x.name ?? '').toLowerCase() !== (name ?? '').toLowerCase());
    if (wasCurrent) {
      const fallback = this.themes[0];
      if (fallback) this.applyTheme(fallback, true);
      else {
        // clear attribute and stored name
        this.root.removeAttribute('data-theme');
        this.saveCurrentThemeName('');
        this.currentTheme = undefined;
        ThemeService.themeChanged.emit(null as any); // consumers should handle null gracefully
      }
    }
    this.emitThemesChanged();
  }

  /** Export/import helpers for UI */
  exportThemesJson(): string {
    return JSON.stringify(this.themes, null, 2);
  }

  importThemesJson(json: string) {
    try {
      const arr = JSON.parse(json) as Theme[];
      if (!Array.isArray(arr)) throw new Error('Invalid themes.json shape');
      this.setThemes(arr);
      const savedName = this.loadSavedThemeName();
      const target = (savedName && this.findByName(savedName)) || this.themes[0];
      if (target) this.applyTheme(target, true);
    } catch (e) {
      console.error('[ThemeService] importThemesJson failed:', e);
    }
  }

  /* ===================== Tokens & Resolution ===================== */

  /**
   * Resolve a token name → hex. If token not found, returns null.
   * e.g., "text.primary" -> colors["brand"] -> "#7c3aed"
   */
  getTokenHex(tokenKey: string): Hex | null {
    const cur = this.currentTheme;
    const map = cur?.tokens as Record<string, string> | undefined;
    if (!map) return null;
    const ref = map[tokenKey];
    return this.resolveColor(ref ?? null);
  }

  /**
   * Resolve literal hex / rgb OR palette color name to hex/rgb string.
   * - "#fff", "#ffffff", "#ffffffff", "rgb(...)", "rgba(...)" → returned as-is
   * - "brand" → colors["brand"] → "#hex"
   */
  resolveColor(keyOrHex: string | null | undefined): Hex | null {
    if (!keyOrHex) return null;
    const s = keyOrHex.trim();
    if (!s) return null;
    if (s.startsWith('#') || s.startsWith('rgb')) return s;
    const hit = this.currentTheme?.colors?.[s];
    return hit ?? null;
  }

  /** Set a token (creates tokens map if missing). */
  setToken(themeName: string, tokenKey: string, ref: string): void {
    const t = this.findByName(themeName);
    if (!t) return;
    const tokens = { ...(t.tokens ?? {}) };
    tokens[tokenKey] = ref;
    this.updateTheme(t.name, { ...t, tokens });
  }

  /** Set a palette color value (e.g., colors["brand"] = "#ff00ff"). */
  setColor(themeName: string, colorKey: string, hex: Hex): void {
    const t = this.findByName(themeName);
    if (!t) return;
    const colors = { ...(t.colors ?? {}) };
    colors[colorKey] = hex;
    this.updateTheme(t.name, { ...t, colors });
  }

  /** Utility lists for editors. */
  listColorKeys(themeName?: string): string[] {
    const t = themeName ? this.findByName(themeName) : this.currentTheme;
    return t?.colors ? Object.keys(t.colors) : [];
  }

  listTokenKeys(themeName?: string): string[] {
    const t = themeName ? this.findByName(themeName) : this.currentTheme;
    const tokens = t?.tokens as Record<string, string> | undefined;
    return tokens ? Object.keys(tokens) : [];
  }

  /* =========================================================
   * Internals
   * ========================================================= */

  private findByName(name: string): Theme | undefined {
    const n = (name ?? '').toLowerCase();
    return this.themes.find(t => (t.name ?? '').toLowerCase() === n);
  }

  private applyTheme(theme: Theme, save: boolean): void {
    if (!theme || !theme.colors) { console.error('[ThemeService] Invalid theme payload:', theme?.name); return; }

    // If same theme name, still re-apply palette (live editing case)
    const nameChanged = this.currentTheme?.name !== theme.name;
    this.currentTheme = this.cloneTheme(theme); // isolate from external mutation

    this.root.setAttribute('data-theme', this.currentTheme.name);
    this.applyPaletteToCss(this.currentTheme);

    if (save) this.saveCurrentThemeName(this.currentTheme.name);
    ThemeService.themeChanged.emit(this.cloneTheme(this.currentTheme));

    // NOTE: do not emit themesChanged here; list didn’t change
    if (nameChanged) {
      // nothing else to do; consumers react on themeChanged
    }
  }

  private applyThemeSmooth(theme: Theme, duration: number): void {
    if (!theme || !theme.colors) {
      console.error('[ThemeService] Invalid theme payload (smooth):', theme?.name);
      return;
    }
    this.currentTheme = this.cloneTheme(theme);
    this.root.setAttribute('data-theme', this.currentTheme.name);

    if (this.useCssVariables) {
      for (const [key, value] of Object.entries(this.currentTheme.colors)) {
        const cssVar = this.toCssVarName(key);
        this.lerpCssVariable(cssVar, value, duration);
      }
    }

    this.saveCurrentThemeName(this.currentTheme.name);
    ThemeService.themeChanged.emit(this.cloneTheme(this.currentTheme));
  }

  /** Export palette to CSS vars – no-ops if disabled. */
  private applyPaletteToCss(theme: Theme) {
    if (!this.useCssVariables) return;
    for (const [k, v] of Object.entries(theme.colors)) {
      this.setCssVariable(this.toCssVarName(k), v);
    }
  }

  private emitThemesChanged() {
    // new array ref to help change detection
    this.themes = this.themes.map(t => t);
    ThemeService.themesChanged.emit(this.cloneList());
  }

  /* ---------------------- CSS var helpers ---------------------- */

  private setCssVariable(cssVariable: string, value: Hex): void {
    this.root.style.setProperty(cssVariable, value);
  }

  private lerpCssVariable(cssVariable: string, targetColor: Hex, duration: number): void {
    // cancel any existing animation for this var
    const prev = this.activeAnims.get(cssVariable);
    if (prev) cancelAnimationFrame(prev);

    const currentColor = this.getCssVariable(cssVariable) || '#000000';
    const [r1, g1, b1, a1] = this.toRgba(currentColor);
    const [r2, g2, b2, a2] = this.toRgba(targetColor);

    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const t = Math.min((timestamp - startTime) / Math.max(1, duration), 1);

      const r = Math.round(this.lerpNum(r1, r2, t));
      const g = Math.round(this.lerpNum(g1, g2, t));
      const b = Math.round(this.lerpNum(b1, b2, t));
      const a = this.lerpNum(a1, a2, t);

      this.root.style.setProperty(cssVariable, `rgba(${r}, ${g}, ${b}, ${a})`);

      if (t < 1) {
        const id = requestAnimationFrame(step);
        this.activeAnims.set(cssVariable, id);
      } else {
        this.activeAnims.delete(cssVariable);
      }
    };

    const id = requestAnimationFrame(step);
    this.activeAnims.set(cssVariable, id);
  }

  // Store only the theme name (prevents stale shape issues)
  private saveCurrentThemeName(name: string): void {
    try { localStorage.setItem('currentTheme', JSON.stringify({ name })); } catch {}
  }

  private loadSavedThemeName(): string | null {
    try {
      const raw = localStorage.getItem('currentTheme');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.name === 'string' ? parsed.name : null;
    } catch { return null; }
  }

  private getCssVariable(cssVariable: string): string {
    return getComputedStyle(this.root).getPropertyValue(cssVariable).trim();
  }

  private toCssVarName(key: string) {
    const kebab = key.includes('-') ? key : this.camelToKebab(key);
    return `--${kebab}`;
  }

  /* ---------------------- Color utils ---------------------- */

  private lerpNum(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /** Normalize any accepted color into RGBA tuple. */
  private toRgba(input: string): [number, number, number, number] {
    const s = input.trim();
    if (s.startsWith('#')) return this.hexToRgba(s);
    if (s.startsWith('rgb')) return this.rgbStringToRgba(s);
    // fallback black
    return [0, 0, 0, 1];
    }

  private hexToRgba(hex: string): [number, number, number, number] {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      // #RGB → #RRGGBB
      h = h.split('').map(ch => ch + ch).join('');
    }
    if (h.length === 4) {
      // #RGBA → expand each and split a
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      const a = parseInt(h[3] + h[3], 16) / 255;
      return [r, g, b, a];
    }
    if (h.length === 6) {
      const bigint = parseInt(h, 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, 1];
    }
    if (h.length === 8) {
      const bigint = parseInt(h, 16);
      const r = (bigint >> 24) & 255;
      const g = (bigint >> 16) & 255;
      const b = (bigint >> 8) & 255;
      const a = (bigint & 255) / 255;
      return [r, g, b, a];
    }
    // invalid – fallback black
    return [0, 0, 0, 1];
  }

  private rgbStringToRgba(rgb: string): [number, number, number, number] {
    // supports rgb(r,g,b) and rgba(r,g,b,a) with spaces
    const m = rgb.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
    if (!m) return [0, 0, 0, 1];
    const r = Math.max(0, Math.min(255, Number(m[1])));
    const g = Math.max(0, Math.min(255, Number(m[2])));
    const b = Math.max(0, Math.min(255, Number(m[3])));
    const a = m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1;
    return [r, g, b, a];
  }

  /* ---------------------- Cloning helpers ---------------------- */

  private cloneTheme(t: Theme): Theme {
    return {
      ...t,
      colors: { ...(t.colors ?? {}) },
      // tokens optional in your schema
      ...(t as any).tokens ? { tokens: { ...(t as any).tokens } } : {},
    } as Theme;
  }

  private cloneList(): Theme[] {
    return this.themes.map(t => this.cloneTheme(t));
  }
}
