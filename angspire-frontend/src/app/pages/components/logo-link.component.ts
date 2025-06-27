import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo-link',
  standalone: true,
  template: `
    <div
      [class]="
        height +
        ' flex ' +
        (isVertical ? 'flex-col' : 'flex-row') + ' ' +
        (collapsed ? 'items-center justify-center' : 'items-center ' + (justifyPosition ?? autoJustifyClass)) +
        ' ' + gap
      "
    >

      @if (!collapsed && labelPosition === 'top') {
        <div class="text-lg text-center whitespace-nowrap">{{ label }}</div>
      }

      <a
        [href]="href"
        target="_blank"
        rel="noopener noreferrer"
        [class]="
          height +
          ' aspect-square block ' +
          (collapsed ? ' flex items-center justify-center' : '')
        "
      >
        <img
          [src]="src"
          [alt]="label"
          class="h-full w-auto object-contain drop-shadow-lg"
        />
      </a>

      @if (!collapsed && labelPosition === 'bottom') {
        <div class="text-lg text-center whitespace-nowrap">{{ label }}</div>
      }

      @if (!collapsed && labelPosition === 'left') {
        <div class="text-lg text-center whitespace-nowrap">{{ label }}</div>
      }

      @if (!collapsed && labelPosition === 'right') {
        <div class="text-lg text-center whitespace-nowrap">{{ label }}</div>
      }
    </div>
  `
})
export class LogoLinkComponent {
  @Input() height = 'h-24';
  @Input() src = '/angspire_icon_neg.png';
  @Input() label = 'logo';
  @Input() href = 'https://github.com/tbarracha/Angspire';
  @Input() collapsed = false;
  @Input() labelPosition: 'top' | 'right' | 'bottom' | 'left' = 'bottom';
  @Input() justifyPosition?: string; // e.g. 'justify-center'
  @Input() gap = 'gap-2';

  get isVertical() {
    return this.labelPosition === 'top' || this.labelPosition === 'bottom';
  }

  get autoJustifyClass() {
    switch (this.labelPosition) {
      case 'left':
        return 'justify-end';
      case 'right':
        return 'justify-start';
      default:
        return 'justify-center';
    }
  }
}
