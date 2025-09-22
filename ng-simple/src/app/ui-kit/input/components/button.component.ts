import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonStyle = 'solid' | 'light' | 'outline' | 'dashed' | 'ghost';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="htmlType"
      [disabled]="disabled"
      [ngClass]="buttonClasses"
      [style.backgroundColor]="backgroundColor"
      [style.color]="textColor"
      [style.borderColor]="borderColor"
      [style.borderStyle]="borderStyle"
      [style.borderWidth]="borderWidth"
      [class.underline]="underlineIdle"
      [class.hover\\:underline]="underlineHover && !disabled"
      class="transition font-semibold rounded-2xl w-full px-4 py-2 focus:outline-none"
      (mouseenter)="hovering = true"
      (mouseleave)="hovering = false"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() style: ButtonStyle = 'solid';
  @Input() mainColor: string = '#000000';
  @Input() contentColor: string = '#ffffff';
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;

  @Input() underlineIdle = false;
  @Input() underlineHover = false;

  hovering = false;

  get backgroundColor(): string | null {
    if (this.disabled) {
      return '#cccccc';
    }
    switch (this.style) {
      case 'solid':
        return this.mainColor;
      case 'light':
        return this.lightenColor(this.mainColor, 0.3);
      case 'outline':
      case 'dashed':
      case 'ghost':
        return 'transparent';
      default:
        return this.mainColor;
    }
  }

  get textColor(): string {
    if (this.disabled) {
      return '#666666';
    }
    switch (this.style) {
      case 'solid':
      case 'light':
        return this.contentColor;
      case 'outline':
      case 'dashed':
      case 'ghost':
        return this.mainColor;
      default:
        return this.contentColor;
    }
  }

  get borderColor(): string | null {
    if (this.disabled) {
      return '#cccccc';
    }
    switch (this.style) {
      case 'outline':
      case 'ghost':
        return this.mainColor;
      case 'dashed':
        return this.mainColor;
      default:
        return null;
    }
  }

  get borderStyle(): string {
    switch (this.style) {
      case 'dashed':
        return 'dashed';
      case 'outline':
      case 'ghost':
        return 'solid';
      default:
        return 'none';
    }
  }

  get borderWidth(): string | null {
    switch (this.style) {
      case 'outline':
      case 'ghost':
      case 'dashed':
        return '2px';
      default:
        return null;
    }
  }

  get buttonClasses(): string[] {
    const cursorClass = this.disabled ? 'cursor-not-allowed' : 'cursor-pointer';
    const shadowClass = this.hovering && !this.disabled ? 'shadow-lg' : '';
    return [
      cursorClass,
      shadowClass,
      this.disabled ? 'opacity-60 pointer-events-none' : '',
    ].filter(Boolean);
  }

  private lightenColor(color: string, amount: number): string {
    // Simple function to lighten hex color by amount (0 to 1)
    let usePound = false;
    let col = color;
    if (col[0] === '#') {
      col = col.slice(1);
      usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + Math.round(255 * amount);
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * amount);
    let b = (num & 0x0000FF) + Math.round(255 * amount);
    r = r > 255 ? 255 : r;
    g = g > 255 ? 255 : g;
    b = b > 255 ? 255 : b;
    return (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
}
