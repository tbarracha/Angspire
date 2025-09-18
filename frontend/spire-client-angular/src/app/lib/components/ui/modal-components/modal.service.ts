/**********************************************************************
 * modal.service.ts – v3.2 • inner component attached synchronously
 * Drop-in replacement: auto-adds w-full / h-full / flex classes to the
 * host element of every inner component so it stretches to fill the modal
 *********************************************************************/
import {
  Injectable, EnvironmentInjector, Injector, Type,
  ComponentRef, InjectionToken
} from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ModalComponent } from './modal.component';
import { ConfirmationModalComponent } from './confirmation-modal.component';

export const MODAL_CLOSE =
  new InjectionToken<(res?: any) => void>('MODAL_CLOSE');

export interface ModalConfig {
  /* visual */
  title?: string;
  hideFooter?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  submitClass?: string;
  cancelClass?: string;

  /* sizing */
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;

  /* behaviour */
  onSubmit?: () => void | boolean | Promise<boolean>;
  onCancel?: () => void | boolean | Promise<boolean>;
}

export interface ModalHandle<TResult = any> {
  componentRef: ComponentRef<any>;           // ← points to INNER component
  afterClosed$: Observable<TResult | null>;
  close: (result?: TResult | null) => void;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  constructor(
    private overlay: Overlay,
    private env: EnvironmentInjector
  ) { }

  open<TInner, TResult = any>(
    innerComponent: Type<TInner>,
    providers: Parameters<typeof Injector.create>[0]['providers'] = [],
    config: ModalConfig = {}
  ): ModalHandle<TResult> {

    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: ['bg-black/30', 'backdrop-blur-sm'],
      panelClass: 'modal-root',
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true,
    });

    const afterClosed$ = new Subject<TResult | null>();

    const baseInjector = Injector.create({
      parent: this.env,
      providers: [
        { provide: MODAL_CLOSE, useValue: (r?: TResult | null) => handle.close(r) },
        ...providers,
      ],
    });

    const modalRef = overlayRef.attach(
      new ComponentPortal(ModalComponent, null, baseInjector, this.env)
    );

    // ⬇⬇⬇ CHANGED: compact, non-full-height defaults
    Object.assign(modalRef.instance, {
      title: config.title ?? '',
      hideFooter: config.hideFooter ?? false,
      submitLabel: config.submitLabel ?? 'Submit',
      cancelLabel: config.cancelLabel ?? 'Cancel',
      submitButtonClass: config.submitClass ?? null,
      cancelButtonClass: config.cancelClass ?? null,
      isOpen: true,

      // size: small, capped, and not full-height
      width: config.width ?? '22rem',
      height: config.height ?? 'auto',   // overrides 'h-full' in template via inline style
      maxWidth: config.maxWidth ?? '90vw',
      maxHeight: config.maxHeight ?? '75vh',
    });
    // ⬆⬆⬆ CHANGED

    modalRef.changeDetectorRef.detectChanges();

    const handle: ModalHandle<TResult> = {
      componentRef: modalRef, // placeholder
      afterClosed$: afterClosed$.asObservable(),
      close: (result: TResult | null = null) => {
        if (!overlayRef.hasAttached()) return;
        overlayRef.dispose();
        afterClosed$.next(result);
        afterClosed$.complete();
      },
    };

    const innerRef = modalRef.instance.attachContent(
      new ComponentPortal(innerComponent, null, baseInjector, this.env)
    );

    // ⬇⬇⬇ CHANGED: remove 'h-full' to avoid stretching the inner content to full height
    const hostEl = innerRef.location.nativeElement as HTMLElement;
    hostEl.classList.add('w-full', 'flex', 'flex-col', 'min-h-0'); // no 'h-full' here
    // ⬆⬆⬆ CHANGED

    handle.componentRef = innerRef;
    modalRef.changeDetectorRef.detectChanges();

    const tryClose =
      (fn?: () => void | boolean | Promise<boolean>) => async () => {
        const ok = fn ? await fn() : true;
        if (ok !== false) handle.close(null);
      };

    overlayRef.backdropClick().subscribe(() => handle.close(null));
    modalRef.instance.cancel.subscribe(tryClose(config.onCancel));
    modalRef.instance.submit.subscribe(tryClose(config.onSubmit));

    return handle;
  }

  /* convenience yes/no -------------------------------------------*/
  confirm(
    message: string,
    title = 'Confirm',
    okLabel = 'Yes',
    cancelLabel = 'No',
    okClass?: string,
    cancelClass?: string
  ): Observable<boolean> {

    const h = this.open<ConfirmationModalComponent, boolean>(
      ConfirmationModalComponent,
      [{ provide: 'MESSAGE', useValue: message }],
      { title, hideFooter: true }
    );

    /* inner component is already attached → assign labels & classes */
    const inner = h.componentRef.instance as ConfirmationModalComponent;
    inner.confirmText = okLabel;
    inner.cancelText = cancelLabel;
    inner.confirmClass = okClass ?? null;
    inner.cancelClass = cancelClass ?? null;
    h.componentRef.changeDetectorRef.detectChanges();

    return h.afterClosed$.pipe(map(v => !!v));
  }
}
