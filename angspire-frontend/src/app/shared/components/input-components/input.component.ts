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
        class="w-full p-3 rounded-md border border-primary placeholder-input-placeholder shadow-sm bg-input-background text-input-text focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent pr-12"
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
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>
        </ng-container>
        <ng-template #eyeClosed>
            <!-- Eye-off Icon SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
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
