/**********************************************************************
 * confirmation-modal.component.ts – body rendered inside <app-modal>
 *********************************************************************/
import { CommonModule } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { MODAL_CLOSE } from './modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
<p class="text-sm text-gray-700 mb-6">{{ message }}</p>

<div class="flex justify-end gap-2">
  <button type="button"
          [class]="confirmClass
            ?? 'px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700'"
          (click)="emit(true)">
    {{ confirmText }}
  </button>

  <button type="button"
          [class]="cancelClass
            ?? 'px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300'"
          (click)="emit(false)">
    {{ cancelText }}
  </button>
</div>
`
})
export class ConfirmationModalComponent {
  @Input() message     = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Yes';
  @Input() cancelText  = 'No';

  /** optional style overrides */
  @Input() confirmClass: string | null = null;
  @Input() cancelClass : string | null = null;

  constructor(
    @Inject(MODAL_CLOSE) private readonly closeModal: (confirm?: boolean) => void
  ) {}

  emit(result: boolean): void { this.closeModal(result); }
}
