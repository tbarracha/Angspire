import { Injectable, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Theme } from './theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private root: HTMLElement;
  private themes: Theme[] = [];
  private currentTheme?: Theme;
  private activeIntervals: Map<string, number> = new Map();

  static readonly themeChanged: EventEmitter<Theme> = new EventEmitter<Theme>();

  // was field-initialized; move to ctor
  private themesUrl!: string;

  constructor(private http: HttpClient, @Inject(DOCUMENT) private doc: Document) {
    this.root = this.doc.documentElement;

    // Base-href–aware URL; if you store in /assets, change to 'assets/themes.json'
    this.themesUrl = new URL('themes.json', this.doc.baseURI).toString();

    this.loadThemes();
  }

  loadThemes(): void {
    this.http.get<Theme[]>(this.themesUrl).subscribe({
      next: (themes) => {
        this.themes = themes ?? [];
        const savedName = this.loadSavedThemeName();
        const initial =
          (savedName && this.findByName(savedName)) ||
          this.themes[0];

        if (initial) {
          // Apply safely
          this.applyTheme(initial, false);
        } else {
          console.warn('[ThemeService] No themes available to apply.');
        }

        // If we resolved a different full Theme than what was saved, persist the correct name
        if (initial?.name) this.saveCurrentThemeName(initial.name);

        console.log('[ThemeService] Themes loaded:', this.themes.map(t => t.name));
      },
      error: (error) => {
        console.error('[ThemeService] Failed to load themes:', error);
      },
    });
  }

  getAllThemes(): Theme[] { return this.themes; }
  getCurrentTheme(): Theme | null { return this.currentTheme ?? null; }

  isDarkMode(): boolean {
    return (this.currentTheme?.name ?? '').toLowerCase() === 'dark';
  }

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

  applyThemeSmoothByIndex(index: number, duration: number = 200): void {
    const theme = this.themes[index];
    if (theme) this.applyThemeSmooth(theme, duration);
    else console.error('[ThemeService] Theme not found:', index);
  }

  applyThemeSmoothByName(themeName: string, duration: number = 200): void {
    const theme = this.findByName(themeName);
    if (theme) this.applyThemeSmooth(theme, duration);
    else console.error('[ThemeService] Theme not found:', themeName);
  }

  private findByName(name: string): Theme | undefined {
    const n = (name ?? '').toLowerCase();
    return this.themes.find(t => (t.name ?? '').toLowerCase() === n);
  }

  private applyTheme(theme: Theme, save: boolean): void {
    if (!theme || !theme.colors) {
      console.error('[ThemeService] Invalid theme payload:', theme?.name);
      return;
    }
    if (this.currentTheme?.name === theme.name) {
      // Already applied
      return;
    }

    this.currentTheme = theme;
    // (Optional) expose current theme name for CSS selectors
    this.root.setAttribute('data-theme', theme.name);

    // Set CSS vars
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVariable = `--${this.camelToKebab(key)}`;
      this.setCssVariable(cssVariable, value);
    });

    if (save) this.saveCurrentThemeName(theme.name);
    ThemeService.themeChanged.emit(this.currentTheme);
  }

  private applyThemeSmooth(theme: Theme, duration: number): void {
    if (!theme || !theme.colors) {
      console.error('[ThemeService] Invalid theme payload (smooth):', theme?.name);
      return;
    }

    this.root.setAttribute('data-theme', theme.name);

    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVariable = `--${this.camelToKebab(key)}`;
      this.lerpCssVariable(cssVariable, value, duration);
    });

    this.currentTheme = theme;
    this.saveCurrentThemeName(theme.name);
    ThemeService.themeChanged.emit(this.currentTheme);
  }

  private setCssVariable(cssVariable: string, value: string): void {
    this.root.style.setProperty(cssVariable, value);
  }

  private lerpCssVariable(cssVariable: string, targetColor: string, duration: number): void {
    const currentColor = this.getCssVariable(cssVariable);
    const [r1, g1, b1] = this.parseRgb(currentColor);
    const [r2, g2, b2] = this.hexToRgb(targetColor);

    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const r = Math.round(this.lerp(r1, r2, progress));
      const g = Math.round(this.lerp(g1, g2, progress));
      const b = Math.round(this.lerp(b1, b2, progress));

      this.root.style.setProperty(cssVariable, `rgb(${r}, ${g}, ${b})`);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.activeIntervals.delete(cssVariable);
      }
    };

    const animationFrameId = requestAnimationFrame(step);
    this.activeIntervals.set(cssVariable, animationFrameId as unknown as number);
  }

  // Store only the theme name (prevents stale shape issues)
  private saveCurrentThemeName(name: string): void {
    localStorage.setItem('currentTheme', JSON.stringify({ name }));
  }

  private loadSavedThemeName(): string | null {
    const raw = localStorage.getItem('currentTheme');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.name === 'string' ? parsed.name : null;
    } catch {
      return null;
    }
  }

  private getCssVariable(cssVariable: string): string {
    return getComputedStyle(this.root).getPropertyValue(cssVariable).trim();
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const sanitizedHex = hex.replace('#', '');
    const bigint = parseInt(sanitizedHex, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  private parseRgb(rgbString: string): [number, number, number] {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? [parseInt(match[1]), 10,][0] ? [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)] : [0, 0, 0] : [0, 0, 0];
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
