import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPrimitiveDirective } from './ui-primitive-directive';
import { UiVariant, UiDensity, UiRadius } from './ui-shared';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, UiPrimitiveDirective],
  template: `
    <button
      uiPrimitive
      [attr.type]="htmlType"
      [color]="color"
      [contrastColor]="contrastColor"
      [variantIdle]="styleIdle"
      [variantHover]="styleHover"
      [disabled]="disabled"
      [underlineIdle]="underlineIdle"
      [underlineHover]="underlineHover"
      [dense]="dense"
      [rounded]="rounded"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() color: string = 'var(--color-primary)';
  @Input() contrastColor?: string;

  @Input() styleIdle: UiVariant = 'filled';
  @Input() styleHover: UiVariant = 'filled';
  @Input() disabled = false;

  @Input() underlineIdle = false;
  @Input() underlineHover = false;

  @Input() dense: UiDensity = 'md';
  @Input() rounded: UiRadius = 'full';
}
