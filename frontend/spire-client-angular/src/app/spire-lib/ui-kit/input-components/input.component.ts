import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconVisibilityComponent, IconVisibilityOffComponent } from '../../../features/icons/components';

export type InputType = 'text' | 'password' | 'secret' | 'email' | 'number';

@Component({
  selector: 'input-component',
  standalone: true,
  imports: [CommonModule, IconVisibilityComponent, IconVisibilityOffComponent],
  template: `
    <div class="relative h-full">
      <label [for]="id" class="block text-sm font-medium mb-1">{{ label }}</label>
      <input
        [id]="id"
        [type]="effectiveType"
        [placeholder]="placeholder"
        class="w-full max-h-10 p-2 rounded-full border border-base-300 placeholder-base-200 shadow-sm bg-base-100 text-base-content focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        [class]="inputClass"
        [attr.autocomplete]="autocomplete"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blur.emit($event)"
        [style.height.px]="numericHeight"
        [style.height]="stringHeight"
      />

      <!-- Show/Hide toggle for password or secret -->
      <button
        *ngIf="isPasswordOrSecret"
        type="button"
        class="absolute top-1/2 right-3 flex items-center text-base-content cursor-pointer"
        tabindex="-1"
        (click)="togglePassword()"
        aria-label="Toggle password visibility"
      >
        <ng-container *ngIf="showPassword; else eyeClosed">
          <!-- Eye Icon SVG -->
          <icon-visibilityOff class="text-base-300" />
        </ng-container>
        <ng-template #eyeClosed>
          <!-- Eye-off Icon SVG -->
          <icon-visibility class="text-base-300"  />
        </ng-template>
      </button>
      <div *ngIf="errorText" class="text-error text-sm mt-1">
        {{ errorText }}
      </div>
    </div>
  `
})
export class InputComponent {
  @Input() id!: string;
  @Input() label!: string;
  @Input() type: InputType = 'text';
  @Input() placeholder: string = '';
  @Input() errorText: string = '';
  @Input() autocomplete: string = 'off';
  @Input() value: string = '';
  @Input() height: string | number = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() blur = new EventEmitter<Event>();

  showPassword = false;

  // Shows password as text if toggled, else actual type
  get effectiveType(): InputType | 'text' {
    return this.showPassword && this.isPasswordOrSecret ? 'text' : this.type;
  }

  get isPasswordOrSecret(): boolean {
    return this.type === 'password' || this.type === 'secret';
  }

  get inputClass(): string | { [klass: string]: boolean } {
    switch (this.effectiveType) {
      case 'password':
      case 'secret':
        return 'pl-4 pr-12';
      default:
        return 'px-4';
    }
  }

  get numericHeight(): number | null {
    // Only use for number values (not empty and not string)
    if (typeof this.height === 'number') return this.height;
    const parsed = Number(this.height);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }

  get stringHeight(): string | null {
    // Only use for string values like '2rem' or '40px'
    if (typeof this.height === 'string' && this.height && isNaN(Number(this.height))) return this.height;
    return null;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onInput(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.valueChange.emit(inputValue);
  }
}
