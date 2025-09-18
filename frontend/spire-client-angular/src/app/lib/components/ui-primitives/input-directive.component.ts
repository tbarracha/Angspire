// input-directive.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeSpec, UiThemeDirective } from '../../modules/themes/theme.directive';

/** Default (opinionated) input theme – override via [theme] */
const DEFAULT_INPUT_THEME: ThemeSpec = {
  idle: {
    colors: {
      bg: 'neutral',
      text: 'foreground-text',
      border: { color: 'primary' },
      placeholder: 'placeholder',
      caret: 'accent'
    },
    corners: { radius: 'md' },
    interactions: { transition: { duration: 120, timing: 'ease' } },
    spacing: { padding: { x: '0.75rem', y: '0.5rem' } }
  },
  hover: {
    colors: { border: { color: 'secondary' } }
  },
  focus: {
    colors: { border: { color: 'accent' }, outline: { color: 'accent' } },
    outline: { width: '2px', offset: '2px' }
  },
  disabled: {
    interactions: { pointerEvents: 'none' },
    colors: { text: '#a3a3a3', bg: '#f4f4f5', border: { color: '#e5e7eb' } }
  }
};

type CoreInputType = 'text'|'email'|'password'|'search'|'number'|'url'|'tel';

@Component({
  standalone: true,
  selector: 'app-input',
  imports: [CommonModule, UiThemeDirective],
  template: `
    <input
      uiTheme
      class="w-full"
      [attr.id]="id"
      [attr.type]="type"
      [placeholder]="placeholder"
      [value]="value"
      (input)="valueChange.emit(($any($event.target)).value)"
      [disabled]="disabled"
      [theme]="theme ?? defaultTheme"
    />
  `
})
export class InputComponent {
  @Input() id?: string;
  @Input() type: CoreInputType = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() disabled = false;

  /** Pass a full ThemeSpec to override defaults */
  @Input() theme?: ThemeSpec;

  readonly defaultTheme = DEFAULT_INPUT_THEME;
}
