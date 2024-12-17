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
    this.http.get<Theme[]>('/themes.json').subscribe({
      next: (themes) => {
        this.themes = themes;
        const savedTheme = this.loadCurrentTheme();
  
        if (savedTheme) {
          setTimeout(() => {
            this.applyTheme(savedTheme, false);
          }, 20);
        } else if (themes.length > 0) {
          this.applyTheme(themes[0], true);
          console.log('[ThemeService] Applied default theme:', themes[0].name);
        }
  
        console.log('[ThemeService] Themes loaded:', this.themes);
      },
      error: (error) => {
        console.error('[ThemeService] Failed to load themes:', error);
      },
    });
  }


  getAllThemes(): Theme[] {
    return this.themes;
  }

  getCurrentTheme(): Theme | null {
    return this.currentTheme || null;
  }

  isDarkMode(): boolean {
    return this.currentTheme.name.toLowerCase() === 'dark';
  }

  toggleDarkMode(): void {
    const themeName = this.isDarkMode() ? 'light' : 'dark';
    this.applyThemeByName(themeName);
  }


  applyThemeByIndex(index: number): void {
    const theme = this.themes[index];
    if (theme) {
      this.applyTheme(theme, true);
    } else {
      console.error('[ThemeService] Theme not found:', index);
    }
  }

  applyThemeByName(themeName: string): void {
    const theme = this.themes.find((t) => t.name === themeName);
    if (theme) {
      this.applyTheme(theme, true);
    } else {
      console.error('[ThemeService] Theme not found:', themeName);
    }
  }

  
  applyThemeSmoothByIndex(index: number, duration: number = 200): void {
    const theme = this.themes[index];
    if (theme) {
      this.applyThemeSmooth(theme, duration);
    } else {
      console.error('[ThemeService] Theme not found:', index);
    }
  }

  applyThemeSmoothByName(themeName: string, duration: number = 200): void {
    const theme = this.themes.find((t) => t.name === themeName);
    if (theme) {
      this.applyThemeSmooth(theme, duration);
    } else {
      console.error('[ThemeService] Theme not found:', themeName);
    }
  }


  private applyTheme(theme: Theme, save: boolean): void {
    if (!theme || (this.currentTheme && theme.name === this.currentTheme.name)) {
      console.warn('[ThemeService] Theme already applied or invalid.');
      return;
    }

    this.currentTheme = theme;

    Object.keys(theme).forEach((key) => {
      if (key !== 'name') {
        const cssVariable = `--${this.camelToKebab(key)}`;
        this.setCssVariable(cssVariable, theme[key]);
      }
    });

    if (save) {
      this.saveCurrentTheme(theme);
    }

    this.themeChanged.emit(this.currentTheme);
  }

  private applyThemeSmooth(theme: Theme, duration: number): void {
    Object.keys(theme).forEach((key) => {
      if (key !== 'name') {
        const cssVariable = `--${this.camelToKebab(key)}`;
        this.lerpCssVariable(cssVariable, theme[key], duration);
      }
    });

    this.currentTheme = theme;
    this.saveCurrentTheme(theme);
    this.themeChanged.emit(this.currentTheme);
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

  private saveCurrentTheme(theme: Theme): void {
    localStorage.setItem('currentTheme', JSON.stringify(theme));
    console.log(`[ThemeService] Theme saved: ${theme.name}`);
  }

  private loadCurrentTheme(): Theme | null {
    const savedTheme = localStorage.getItem('currentTheme');
    if (savedTheme) {
      try {
        const theme: Theme = JSON.parse(savedTheme);
        console.log(`[ThemeService] Loaded saved theme: ${theme.name}`);
        return theme;
      } catch (error) {
        console.error('[ThemeService] Failed to parse saved theme:', error);
      }
    }
    return null;
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
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
