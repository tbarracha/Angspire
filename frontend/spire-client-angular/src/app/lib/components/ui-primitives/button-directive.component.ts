import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeSpec, UiThemeDirective } from '../../modules/themes/theme.directive';

/** Default (opinionated) button theme – override via [theme] */
const DEFAULT_BUTTON_THEME: ThemeSpec = {
  base: {
    // applies to ALL states unless overridden
    corners: { radius: 'full' },
    spacing: {
      padding: { x: '1rem', y: '1rem' },   // inner space (16px x 8px)
      // margin:  { x: '0.25rem', y: '0.25rem' } // OPTIONAL outer spacing
    },
    interactions: {
      transition: { duration: 150, timing: 'ease' },
      cursor: 'pointer'
    }
  },
  idle: {
    colors: {
      bg: 'primary',
      text: 'foreground-text',
      border: { color: 'primary' },
      outline: { color: 'accent' }
    }
  },
  hover: {
    colors: { bg: 'accent', text: 'accent-contrast' },
    effects: { shadow: 'lg' }
  },
  focus: {
    outline: { width: '2px', offset: '2px', color: 'accent' }
  },
  active: {
    colors: { bg: '#dc2626' }
  },
  disabled: {
    colors: {
      bg: '#f4f4f5',
      text: '#a3a3a3',
      border: { color: '#e5e7eb' }
    },
    interactions: { cursor: 'not-allowed', pointerEvents: 'none' }
  }
};

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, UiThemeDirective],
  template: `
    <button
      uiTheme
      [attr.type]="htmlType"
      [disabled]="disabled"
      [theme]="theme ?? defaultTheme"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;

  /** Pass a full ThemeSpec to override defaults */
  @Input() theme?: ThemeSpec;

  readonly defaultTheme = DEFAULT_BUTTON_THEME;
}
