/**********************************************************************
 * modal.component.ts – flexible wrapper with Portal outlet
 * FIX: don’t close if the pointer-down started inside the dialog
 *********************************************************************/
import { CommonModule } from '@angular/common';
import {
  Component, Input, Output, EventEmitter, ContentChild, TemplateRef,
  ViewChild, ComponentRef
} from '@angular/core';
import {
  CdkPortalOutlet, ComponentPortal, PortalModule
} from '@angular/cdk/portal';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, PortalModule],
  template: `
<!-- Backdrop -->
<div *ngIf="isOpen"
     class="fixed inset-0 z-50 flex items-center justify-center
            bg-black/30 backdrop-blur-sm"
     (pointerdown)="onOverlayPointerDown($event)"
     (click)="onOverlayClick($event)">

  <!-- Dialog -->
  <div class="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full"
       (click)="$event.stopPropagation()"
       [ngStyle]="{ width, height, maxWidth, maxHeight }">

    <!-- Header -->
    <ng-container *ngIf="headerTemplate; else defHeader">
      <ng-container *ngTemplateOutlet="headerTemplate"></ng-container>
    </ng-container>
    <ng-template #defHeader>
      <div class="flex items-center justify-between px-4 py-2">
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <button aria-label="Close"
                class="text-gray-500 hover:text-gray-700"
                (click)="close()">✕</button>
      </div>
    </ng-template>

    <!-- Body -->
    <div class="flex-1 h-full overflow-auto p-4 flex flex-col min-h-0">
      <ng-content></ng-content>
      <ng-template cdkPortalOutlet></ng-template>
    </div>

    <!-- Footer -->
    <div *ngIf="!hideFooter" class="flex justify-end gap-2 px-4 py-3">
      <button type="button"
              [class]="submitButtonClass
                 ?? 'px-4 py-2 rounded-full bg-accent text-light hover:bg-accent/90'"
              (click)="onSubmit()">
        {{ submitLabel }}
      </button>
      <button type="button"
              [class]="cancelButtonClass
                 ?? 'px-4 py-2 rounded-full bg-primary hover:bg-primary/90'"
              (click)="close()">
        {{ cancelLabel }}
      </button>
    </div>
  </div>
</div>
`
})
export class ModalComponent {
  /*  header  */
  @Input() title = '';

  /*  footer  */
  @Input() hideFooter = false;
  @Input() submitLabel  = 'Submit';
  @Input() cancelLabel  = 'Cancel';
  @Input() submitButtonClass:  string | null = null;
  @Input() cancelButtonClass:  string | null = null;

  /*  visibility  */
  @Input() isOpen = false;

  /*  sizing  */
  @Input() width: string | null = null;      // e.g. '80vw', '600px', '80%'
  @Input() height: string | null = null;     // e.g. '80vh', '600px'
  @Input() maxWidth: string | null = '32rem';
  @Input() maxHeight: string | null = null;

  /*  outputs  */
  @Output() submit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ContentChild('headerTemplate') headerTemplate?: TemplateRef<unknown>;
  @ViewChild(CdkPortalOutlet) private outlet?: CdkPortalOutlet;

  /*  internal state  */
  private pressStartedOnBackdrop = false;

  /** Remember where the gesture started */
  onOverlayPointerDown(ev: PointerEvent) {
    this.pressStartedOnBackdrop = ev.target === ev.currentTarget;
  }

  /** Close only if the press began AND ended on the backdrop */
  onOverlayClick(ev: MouseEvent) {
    if (this.pressStartedOnBackdrop && ev.target === ev.currentTarget) {
      this.close();
    }
  }

  /** Service hook */
  attachContent<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    if (!this.outlet) throw new Error('Portal outlet not available yet');
    return this.outlet.attachComponentPortal(portal);
  }

  close()    { this.cancel.emit(); }
  onSubmit() { this.submit.emit(); }
}
