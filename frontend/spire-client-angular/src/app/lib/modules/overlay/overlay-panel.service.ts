// src/app/lib/shared/overlay/overlay-panel.service.ts
import {
  Injectable, EnvironmentInjector, Injector, InjectionToken, Type, ComponentRef,
  TemplateRef, ViewContainerRef
} from '@angular/core';
import { SmartOverlayService, PositionKey } from './smart-overlay.service';
import { GenericOverlayPanelComponent } from './generic-overlay-panel.component';
import { OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

export const OVERLAY_DATA  = new InjectionToken<any>('OVERLAY_DATA');
export const OVERLAY_CLOSE = new InjectionToken<() => void>('OVERLAY_CLOSE');

export interface PanelOptionsBase {
  title?: string;
  showClose?: boolean;
  paddingClass?: string | null;
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  position?: PositionKey | PositionKey[];
  panelClass?: string | string[];
  onClose?: () => void;
}

export interface PanelHandleBase {
  overlayRef: OverlayRef;
  panelRef: ComponentRef<GenericOverlayPanelComponent>;
  close: () => void;
}

export interface PanelHandle<TInner> extends PanelHandleBase {
  innerRef: ComponentRef<TInner>;
}

@Injectable({ providedIn: 'root' })
export class OverlayPanelService {
  constructor(private smart: SmartOverlayService) {}

  open<TInner>(
    anchor: HTMLElement,
    innerComponent: Type<TInner>,
    env: EnvironmentInjector,
    opts: PanelOptionsBase & { innerInputs?: Partial<TInner>; innerData?: any } = {}
  ): PanelHandle<TInner> {
    const handle = this.smart.open(anchor, GenericOverlayPanelComponent, env, {
      position: opts.position ?? ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      panelClass: opts.panelClass ?? ['bg-transparent', 'p-0', 'rounded-2xl', 'shadow-none', 'border-0'],
      onClose: opts.onClose
    });

    const panelRef = handle.componentRef;
    panelRef.instance.title        = opts.title ?? '';
    panelRef.instance.showClose    = opts.showClose ?? true;
    panelRef.instance.paddingClass = opts.paddingClass ?? 'p-3';
    panelRef.instance.width        = opts.width ?? 'min(720px,94vw)';
    panelRef.instance.maxWidth     = opts.maxWidth ?? '94vw';
    panelRef.instance.maxHeight    = opts.maxHeight ?? '75vh';
    panelRef.instance.closeSelf    = handle.close;
    panelRef.changeDetectorRef.detectChanges();

    const innerInjector = Injector.create({
      parent: env,
      providers: [
        { provide: 'OVERLAY_DATA', useValue: opts['innerData'] ?? null },
        { provide: OVERLAY_DATA,   useValue: opts['innerData'] ?? null },
        { provide: OVERLAY_CLOSE,  useValue: handle.close }
      ]
    });

    const innerRef = panelRef.instance.attachInner(innerComponent, env, innerInjector);
    if (opts['innerInputs']) Object.assign(innerRef.instance as any, opts['innerInputs']);
    panelRef.changeDetectorRef.detectChanges();

    return { overlayRef: handle.overlayRef, panelRef, innerRef, close: handle.close };
  }

  /** NEW: open a panel using a TemplateRef from the caller component */
  openTemplate(
    anchor: HTMLElement,
    template: TemplateRef<any>,
    vcr: ViewContainerRef,
    env: EnvironmentInjector,
    opts: PanelOptionsBase = {}
  ): PanelHandleBase {
    const handle = this.smart.open(anchor, GenericOverlayPanelComponent, env, {
      position: opts.position ?? ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      panelClass: opts.panelClass ?? ['bg-transparent', 'p-0', 'rounded-2xl', 'shadow-none', 'border-0'],
      onClose: opts.onClose
    });

    const panelRef = handle.componentRef;
    panelRef.instance.title        = opts.title ?? '';
    panelRef.instance.showClose    = opts.showClose ?? true;
    panelRef.instance.paddingClass = opts.paddingClass ?? 'p-3';
    panelRef.instance.width        = opts.width ?? 'min(720px,94vw)';
    panelRef.instance.maxWidth     = opts.maxWidth ?? '94vw';
    panelRef.instance.maxHeight    = opts.maxHeight ?? '75vh';
    panelRef.instance.closeSelf    = handle.close;
    panelRef.changeDetectorRef.detectChanges();

    panelRef.instance.attachTemplate(new TemplatePortal(template, vcr));
    panelRef.changeDetectorRef.detectChanges();

    return { overlayRef: handle.overlayRef, panelRef, close: handle.close };
  }
}
