import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Theme {
  name: string;
  [key: string]: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private root = document.documentElement;
  private themes: Theme[] = [];
  private currentTheme!: Theme;
  private activeIntervals: Map<string, number> = new Map();

  themeChanged: EventEmitter<Theme> = new EventEmitter<Theme>();

  constructor(private http: HttpClient) {
    this.loadThemes();
  }

  loadThemes(): void {
    this.http.get<Theme[]>('/themes.json').subscribe(
      (themes) => {
        this.themes = themes;
        if (!this.currentTheme && themes.length > 0) {
          this.applyThemeByName(themes[0].name); // Apply the first theme
        }
        console.log('[ThemeService] Themes loaded:', this.themes);
      },
      (error) => {
        console.error('[ThemeService] Failed to load themes:', error);
      }
    );
  }

  getAllThemes(): Theme[] {
    return this.themes;
  }

  getCurrentTheme(): Theme | null {
    return this.currentTheme || null;
  }

  applyThemeByName(themeName: string): void {
    const theme = this.getAllThemes().find((t) => t.name === themeName);
    if (theme) {
      this.applyTheme(theme);
    } else {
      console.error('[ThemeService] Theme not found:', themeName);
    }
  }

  applyThemeSmoothByName(themeName: string, duration: number = 200): void {
    const theme = this.getAllThemes().find((t) => t.name === themeName);
    if (!theme) {
      console.error('[ThemeService] Theme not found:', themeName);
      return;
    }

    if (this.currentTheme && theme.name === this.currentTheme.name) {
      console.warn('[ThemeService] Theme already applied smoothly:', theme.name);
      return;
    }

    this.applyThemeSmooth(theme, duration);
  }

  private applyTheme(theme: Theme): void {
    if (!theme) {
      console.error('[ThemeService] Invalid theme provided:', theme);
      return;
    }

    if (this.currentTheme && theme.name === this.currentTheme.name) {
      console.warn('[ThemeService] Theme already applied:', theme.name);
      return;
    }

    this.currentTheme = theme;

    Object.keys(theme).forEach((key) => {
      if (key !== 'name') {
        const cssVariable = `--${this.camelToKebab(key)}`;
        const targetColor = theme[key];
        const currentColor = this.getCssVariable(cssVariable);

        // Skip applying the value if it's already the same
        if (currentColor === targetColor) {
          console.log(`[ThemeService] Skipping unchanged variable: ${cssVariable}`);
          return;
        }

        this.setCssVariable(cssVariable, targetColor);
      }
    });

    this.themeChanged.emit(this.currentTheme);
  }

  private applyThemeSmooth(theme: Theme, duration: number = 200): void {
    Object.keys(theme).forEach((key) => {
      if (key !== 'name') {
        const cssVariable = `--${this.camelToKebab(key)}`;
        const targetColor = theme[key];
        const currentColor = this.getCssVariable(cssVariable);

        // Skip interpolation if the target is already the same
        if (currentColor === targetColor) {
          console.log(`[ThemeService] Skipping unchanged variable for smooth transition: ${cssVariable}`);
          return;
        }

        if (this.activeIntervals.has(cssVariable)) {
          clearInterval(this.activeIntervals.get(cssVariable)!);
          this.activeIntervals.delete(cssVariable);
        }

        this.lerpCssVariable(cssVariable, targetColor, duration);
      }
    });

    this.currentTheme = theme;
    this.themeChanged.emit(this.currentTheme);
  }

  private setCssVariable(cssVariable: string, value: string): void {
    try {
      this.root.style.setProperty(cssVariable, value);
    } catch (error) {
      console.error('[ThemeService] Failed to set CSS variable:', cssVariable, error);
    }
  }

  private getCssVariable(cssVariable: string): string {
    let value = getComputedStyle(this.root).getPropertyValue(cssVariable).trim();
    if (value.startsWith('#')) {
      value = this.hexToRgbString(value);
    } else if (!value.startsWith('rgb')) {
      value = 'rgb(0, 0, 0)';
    }
    return value;
  }

  private lerpCssVariable(cssVariable: string, targetColor: string, duration: number): void {
    const currentColor = this.getCssVariable(cssVariable);
    const [r1, g1, b1] = this.parseRgb(currentColor);
    const [r2, g2, b2] = this.hexToRgb(targetColor);

    const steps = Math.round(duration / 16); // Approximate 60 FPS
    let currentStep = 0;

    const interval = setInterval(() => {
      const t = currentStep / steps;
      const r = Math.round(this.lerp(r1, r2, t));
      const g = Math.round(this.lerp(g1, g2, t));
      const b = Math.round(this.lerp(b1, b2, t));

      this.root.style.setProperty(cssVariable, `rgb(${r}, ${g}, ${b})`);

      if (currentStep++ >= steps) {
        clearInterval(interval);
        this.activeIntervals.delete(cssVariable);
      }
    }, 16);

    this.activeIntervals.set(cssVariable, interval as unknown as number);
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const sanitizedHex = hex.replace('#', '');
    const bigint = parseInt(sanitizedHex, 16);
    return [
      (bigint >> 16) & 255, // Red
      (bigint >> 8) & 255,  // Green
      bigint & 255,         // Blue
    ];
  }

  private hexToRgbString(hex: string): string {
    const [r, g, b] = this.hexToRgb(hex);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseRgb(rgbString: string): [number, number, number] {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0];
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
