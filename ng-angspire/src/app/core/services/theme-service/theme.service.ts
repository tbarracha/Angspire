import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Theme {
  name: string;
  [key: string]: string; // Allows dynamic properties for theme variables
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private root = document.documentElement;
  private themes: Theme[] = [];
  private currentTheme!: Theme;

  themeChanged: EventEmitter<Theme> = new EventEmitter<Theme>();

  constructor(private http: HttpClient) {
    this.loadThemes();
  }

  loadThemes(): void {
    this.http.get<Theme[]>('/themes.json').subscribe(
      (themes) => {
        this.themes = themes;
        if (themes.length > 0) {
          this.applyTheme(themes[0]);
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
        this.setCssVariable(cssVariable, targetColor);
      }
    });

    this.themeChanged.emit(this.currentTheme);
  }

  private setCssVariable(cssVariable: string, value: string): void {
    try {
      this.root.style.setProperty(cssVariable, value);
    } catch (error) {
      console.error('[ThemeService] Failed to set CSS variable:', cssVariable, error);
    }
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
