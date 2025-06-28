import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonType = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
type ButtonStyle = 'filled' | 'outlined' | 'text';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="htmlType"
      [disabled]="disabled"
      [ngClass]="currentClasses"
      [class.underline]="underlineIdle"
      [class.hover\\:underline]="underlineHover && !disabled"
      class="transition font-semibold rounded w-full px-4 py-2 focus:outline-none"
      (mouseenter)="hovering = true"
      (mouseleave)="hovering = false"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() type: ButtonType = 'primary';
  @Input() styleIdle: ButtonStyle = 'filled';
  @Input() styleHover: ButtonStyle = 'filled';
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;

  @Input() underlineIdle = false;
  @Input() underlineHover = false;

  hovering = false;

  // NO border classes anywhere, only rings!
  private styleMap: Record<ButtonType, Record<ButtonStyle, string>> = {
    primary: {
      filled:   'bg-primary text-primary-contrast',
      outlined: 'bg-transparent text-primary ring-2 ring-primary',
      text:     'bg-transparent text-primary',
    },
    secondary: {
      filled:   'bg-secondary text-secondary-contrast',
      outlined: 'bg-transparent text-secondary ring-2 ring-secondary',
      text:     'bg-transparent text-secondary',
    },
    accent: {
      filled:   'bg-accent text-accent-contrast',
      outlined: 'bg-transparent text-accent ring-2 ring-accent',
      text:     'bg-transparent text-accent',
    },
    success: {
      filled:   'bg-success text-success-contrast',
      outlined: 'bg-transparent text-success ring-2 ring-success',
      text:     'bg-transparent text-success',
    },
    warning: {
      filled:   'bg-warning text-warning-contrast',
      outlined: 'bg-transparent text-warning ring-2 ring-warning',
      text:     'bg-transparent text-warning',
    },
    error: {
      filled:   'bg-error text-error-contrast',
      outlined: 'bg-transparent text-error ring-2 ring-error',
      text:     'bg-transparent text-error',
    },
    info: {
      filled:   'bg-info text-info-contrast',
      outlined: 'bg-transparent text-info ring-2 ring-info',
      text:     'bg-transparent text-info',
    }
  };

  get currentClasses(): string[] {
  const type = this.type;
  const style = this.hovering ? this.styleHover : this.styleIdle;
  const baseClass = this.styleMap[type][style];

  const cursorClass = this.disabled ? 'cursor-not-allowed' : 'cursor-pointer';

  const ringFocus =
    style === 'outlined'
      ? `focus-visible:ring-4 focus-visible:ring-${type} focus-visible:ring-opacity-70`
      : '';

  return [
    baseClass,
    ringFocus,
    cursorClass,
    this.disabled ? 'opacity-60 pointer-events-none' : '',
    this.hovering ? 'shadow-lg' : '',
  ].filter(Boolean);
}

}
