import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div
  *ngIf="isOpen"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
>
  <div class="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <button
        type="button"
        aria-label="Close"
        (click)="onCancel()"
        class="text-gray-500 hover:text-gray-700"
      >
        &#10005;
      </button>
    </div>

    <!-- Body -->
    <div class="p-4 text-sm text-gray-700">
      {{ message }}
    </div>

    <!-- Footer -->
    <div class="flex justify-end px-4 py-3 border-t space-x-2">
      <button
        type="button"
        class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        (click)="onCancel()"
      >
        {{ cancelText }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        (click)="onConfirm()"
      >
        {{ confirmText }}
      </button>
    </div>
  </div>
</div>
`
})
export class ConfirmationModalComponent {
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() isOpen = false;

  @Input() confirmText = 'Yes';
  @Input() cancelText = 'No';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
