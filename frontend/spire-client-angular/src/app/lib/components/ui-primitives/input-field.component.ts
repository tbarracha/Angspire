// input-field.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputComponent as UiInputComponent } from './input-directive.component';
import { ThemeSpec } from '../../modules/themes/theme.directive';

type CoreInputType = 'text'|'email'|'password'|'search'|'number'|'url'|'tel';
type LabelPos = 'top'|'left'|'right'|'bottom';

export interface InputProps {
  id?: string;
  type?: CoreInputType;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  theme?: ThemeSpec; // allow overriding the inner input theme
}

@Component({
  standalone: true,
  selector: 'app-input-field',
  imports: [CommonModule, UiInputComponent],
  template: `
    @if (labelPosition === 'top') {
      <div class="flex flex-col gap-1">
        @if (label) {
          <label class="text-sm text-gray-700" [attr.for]="safeId()">
            {{ label }} @if (required) { <span class="text-red-600">*</span> }
          </label>
        }
        <app-input
          [id]="p.id ?? safeId()"
          [type]="p.type ?? type"
          [placeholder]="p.placeholder ?? placeholder"
          [value]="p.value ?? value"
          (valueChange)="valueChange.emit($event)"
          [disabled]="p.disabled ?? disabled"
          [theme]="p.theme ?? theme"
        />
        @if (hint || error) {
          <div class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
            {{ error || hint }}
          </div>
        }
      </div>
    }

    @if (labelPosition === 'left') {
      <div class="flex items-center gap-3">
        @if (label) {
          <label class="shrink-0 text-sm text-gray-700" [style.width]="labelWidth" [attr.for]="safeId()">
            {{ label }} @if (required) { <span class="text-red-600">*</span> }
          </label>
        }
        <div class="flex-1 min-w-0">
          <app-input
            [id]="p.id ?? safeId()"
            [type]="p.type ?? type"
            [placeholder]="p.placeholder ?? placeholder"
            [value]="p.value ?? value"
            (valueChange)="valueChange.emit($event)"
            [disabled]="p.disabled ?? disabled"
            [theme]="p.theme ?? theme"
          />
          @if (hint || error) {
            <div class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
              {{ error || hint }}
            </div>
          }
        </div>
      </div>
    }

    @if (labelPosition === 'right') {
      <div class="flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <app-input
            [id]="p.id ?? safeId()"
            [type]="p.type ?? type"
            [placeholder]="p.placeholder ?? placeholder"
            [value]="p.value ?? value"
            (valueChange)="valueChange.emit($event)"
            [disabled]="p.disabled ?? disabled"
            [theme]="p.theme ?? theme"
          />
          @if (hint || error) {
            <div class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
              {{ error || hint }}
            </div>
          }
        </div>
        @if (label) {
          <label class="shrink-0 text-sm text-gray-700" [style.width]="labelWidth" [attr.for]="safeId()">
            {{ label }} @if (required) { <span class="text-red-600">*</span> }
          </label>
        }
      </div>
    }

    @if (labelPosition === 'bottom') {
      <div class="flex flex-col gap-1">
        <app-input
          [id]="p.id ?? safeId()"
          [type]="p.type ?? type"
          [placeholder]="p.placeholder ?? placeholder"
          [value]="p.value ?? value"
          (valueChange)="valueChange.emit($event)"
          [disabled]="p.disabled ?? disabled"
          [theme]="p.theme ?? theme"
        />
        @if (label) {
          <label class="text-sm text-gray-700" [attr.for]="safeId()">
            {{ label }} @if (required) { <span class="text-red-600">*</span> }
          </label>
        }
        @if (hint || error) {
          <div class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
            {{ error || hint }}
          </div>
        }
      </div>
    }
  `
})
export class InputFieldComponent {
  // Label
  @Input() label?: string;
  @Input() required = false;
  @Input() labelPosition: LabelPos = 'top';
  @Input() labelWidth = '8rem';

  // Help/error
  @Input() hint?: string;
  @Input() error?: string;

  // Forwarded base inputs
  @Input() id?: string;
  @Input() type: CoreInputType = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  // Theme passthrough (defaults come from inner <app-input>)
  @Input() theme?: ThemeSpec;

  // Disable passthrough
  @Input() disabled = false;

  /** Object overrides for the inner <app-input>. */
  @Input() inputProps?: Partial<InputProps>;

  // Stable id when not provided
  private _id = signal(this.id || `in_${Math.random().toString(36).slice(2, 8)}`);
  safeId() { return this.id || this._id(); }

  /** Merge `inputProps` overrides with local inputs. */
  get p(): InputProps {
    return {
      id: this.id,
      type: this.type,
      placeholder: this.placeholder,
      value: this.value,
      disabled: this.disabled,
      theme: this.theme,
      ...(this.inputProps ?? {})
    };
  }
}
