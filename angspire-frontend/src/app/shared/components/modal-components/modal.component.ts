import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: ` 
  <!-- Only render when open -->
<div
  *ngIf="isOpen"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
>
  <div class="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <button
        type="button"
        aria-label="Close"
        (click)="close()"
        class="text-gray-500 hover:text-gray-700"
      >
        &#10005;
      </button>
    </div>

    <!-- Body (projected) -->
    <div class="p-4">
      <ng-content></ng-content>
    </div>

    <!-- Footer -->
    <div class="flex justify-end px-4 py-3 border-t space-x-2">
      <button
        type="button"
        class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        (click)="onSubmit()"
      >
        Submit
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        (click)="close()"
      >
        Cancel
      </button>
    </div>
  </div>
</div>

  `
})
export class ModalComponent {
  /** Title text at top of the dialog */
  @Input() title = '';

  /** Control open / closed from the parent */
  @Input() isOpen = false;

  /** Fired when user clicks “Submit” */
  @Output() submit = new EventEmitter<void>();

  /** Fired when user clicks “Cancel” or the X */
  @Output() cancel = new EventEmitter<void>();

  close() {
    this.cancel.emit();
  }

  onSubmit() {
    this.submit.emit();
  }
}
