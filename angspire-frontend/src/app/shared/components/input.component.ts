import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'input-component',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <label [for]="id" class="block text-sm font-medium mb-1">{{ label }}</label>
      <input
        [id]="id"
        [type]="showPassword ? 'text' : type"
        [placeholder]="placeholder"
        class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm bg-input-background text-input-text focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent pr-12"
        [attr.autocomplete]="autocomplete"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blur.emit($event)"
      />

      <!-- Show/Hide toggle for password or secret -->
      <button
        *ngIf="isPasswordOrSecret"
        type="button"
        class="absolute top-[38px] right-3 flex items-center text-secondary"
        tabindex="-1"
        (click)="togglePassword()"
        aria-label="Toggle password visibility"
      >
        <ng-container *ngIf="showPassword; else eyeClosed">
          <!-- Eye Icon SVG -->
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </ng-container>
        <ng-template #eyeClosed>
          <!-- Eye-off Icon SVG -->
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.99 9.99 0 012.463-4.028M21 21l-6-6M9.88 9.88a3 3 0 104.24 4.24" />
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 12a3 3 0 01-2.197 2.897M6.18 6.18l-1.39-1.39M17.82 17.82l1.39 1.39" />
          </svg>
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
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() errorText: string = '';
  @Input() autocomplete: string = 'off';
  @Input() value: string = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() blur = new EventEmitter<Event>();

  showPassword = false;

  get isPasswordOrSecret() {
    return this.type === 'password' || this.type === 'secret';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onInput(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.valueChange.emit(inputValue);
  }
}
