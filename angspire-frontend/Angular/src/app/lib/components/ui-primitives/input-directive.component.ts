import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPrimitiveDirective } from './ui-primitive-directive';
import { UiDensity, UiRadius, UiVariant } from './ui-shared';

@Component({
  standalone: true,
  selector: 'app-input',
  imports: [CommonModule, UiPrimitiveDirective],
  template: `
    <input
      uiPrimitive
      [attr.id]="id"
      [attr.type]="type"
      [placeholder]="placeholder"
      [value]="value"
      (input)="valueChange.emit(($any($event.target)).value)"
      [color]="color"
      [contrastColor]="contrastColor"
      [variantIdle]="variantIdle"
      [variantHover]="variantHover"
      [disabled]="disabled"
      [dense]="dense"
      [rounded]="rounded"
      [placeholderColor]="placeholderColor"
      class="w-full"
    />
  `
})
export class InputComponent {
  @Input() id?: string;
  @Input() type: 'text'|'email'|'password'|'search'|'number'|'url'|'tel' = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() color: string = 'var(--accent)';
  @Input() contrastColor?: string;

  @Input() variantIdle: UiVariant = 'outlined';
  @Input() variantHover: UiVariant = 'ringed';

  @Input() disabled = false;
  @Input() dense: UiDensity = 'md';
  @Input() rounded: UiRadius = 'md';

  @Input() placeholderColor: string | null = '#9ca3af';
}
