// src/app/lib/shared/overlay/generic-overlay-panel.component.ts
import { CommonModule } from '@angular/common';
import {
  Component, Input, ViewChild, ComponentRef,
  EnvironmentInjector, Injector, Type, ChangeDetectionStrategy
} from '@angular/core';
import { CdkPortalOutlet, ComponentPortal, PortalModule, TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-generic-overlay-panel',
  standalone: true,
  imports: [CommonModule, PortalModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div
    class="rounded-2xl border bg-white shadow-2xl flex flex-col"
    [class.p-0]="!paddingClass"
    [ngClass]="paddingClass"
    [style.width]="width"
    [style.maxHeight]="maxHeight"
    [style.maxWidth]="maxWidth"
    (keydown.escape)="closeSelf?.()"
  >
    <div *ngIf="title || showClose"
         class="flex items-center justify-between px-3 py-2 border-b shrink-0">
      <div class="text-sm font-semibold truncate" [title]="title">{{ title }}</div>
      <button *ngIf="showClose" class="text-gray-500 hover:text-gray-700" (click)="closeSelf?.()">✕</button>
    </div>

    <div class="flex-1 min-h-0 overflow-auto">
      <ng-template cdkPortalOutlet></ng-template>
    </div>
  </div>
  `
})
export class GenericOverlayPanelComponent {
  /** Visual */
  @Input() title = '';
  @Input() showClose = true;
  @Input() paddingClass: string | null = 'p-3';

  /** Sizing */
  @Input() width: string = 'auto';
  @Input() maxWidth: string = '94vw';
  @Input() maxHeight: string = '75vh';

  /** Close function assigned by the service */
  @Input() closeSelf?: () => void;

  @ViewChild(CdkPortalOutlet, { static: true }) outlet!: CdkPortalOutlet;

  /** Attach any inner component into this panel. */
  attachInner<T>(cmp: Type<T>, env: EnvironmentInjector, injector: Injector): ComponentRef<T> {
    return this.outlet.attachComponentPortal(new ComponentPortal(cmp, null, injector, env));
  }

  /** Allows attaching a TemplatePortal */
  attachTemplate(portal: TemplatePortal<any>) {
    this.outlet.attachTemplatePortal(portal);
  }
}
