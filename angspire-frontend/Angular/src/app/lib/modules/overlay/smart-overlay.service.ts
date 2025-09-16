// smart-overlay.service.ts
import {
  Injectable,
  EnvironmentInjector,
  Injector,
  Type,
  ComponentRef,
} from '@angular/core';
import {
  Overlay,
  OverlayRef,
  ConnectedPosition,
  OverlayConfig,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

export interface SmartOverlayHandle<T> {
  overlayRef: OverlayRef;
  componentRef: ComponentRef<T>;
  close: () => void;
}

export type PositionKey =
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'top' | 'top-start' | 'top-end'
  | 'right' | 'right-start' | 'right-end'
  | 'left' | 'left-start' | 'left-end';

@Injectable({ providedIn: 'root' })
export class SmartOverlayService {
  private readonly GAP = 4;
  private openMap = new Map<unknown, SmartOverlayHandle<unknown>>();

  constructor(private overlay: Overlay) { }

  /* ------------------- PUBLIC helpers ------------------- */

  /** Is there an overlay open for this key (or anchor element)? */
  isOpen(key: unknown): boolean {
    return this.openMap.has(key);
  }

  /** Get the typed handle for an open overlay, if any. */
  get<T>(key: unknown): SmartOverlayHandle<T> | null {
    return (this.openMap.get(key) as SmartOverlayHandle<T>) ?? null;
  }

  /** Close a specific overlay if it’s still open. */
  close(key: unknown): void {
    this.openMap.get(key)?.close();
  }

  /** Close every overlay managed by this service. */
  closeAll(): void {
    [...this.openMap.keys()].forEach(k => this.openMap.get(k)?.close());
  }

  /** Convenience: open if closed, otherwise close (toggle). */
  toggle<T>(
    anchor: HTMLElement,
    component: Type<T>,
    envInjector: EnvironmentInjector,
    cfg: {
      key?: unknown;
      data?: Partial<T>;
      panelClass?: string | string[];
      position?: PositionKey | PositionKey[];
      onClose?: () => void;
    } = {}
  ): SmartOverlayHandle<T> | null {
    const key = cfg.key ?? anchor;
    if (this.isOpen(key)) {
      this.close(key);
      return null;
    }
    return this.open(anchor, component, envInjector, cfg);
  }

  /* ------------------- Open ------------------- */
  open<T>(
    anchor: HTMLElement,
    component: Type<T>,
    envInjector: EnvironmentInjector,
    cfg: {
      key?: unknown;
      data?: Partial<T>;
      panelClass?: string | string[];
      position?: PositionKey | PositionKey[];
      onClose?: () => void;
    } = {}
  ): SmartOverlayHandle<T> {
    const mapKey = cfg.key ?? anchor;
    this.close(mapKey); // idempotent

    const positions = this._resolvePositions(cfg.position);
    const posStrategy = this.overlay
      .position()
      .flexibleConnectedTo(anchor)
      .withPositions(positions)
      .withFlexibleDimensions(true)
      .withViewportMargin(8)
      .withPush(false);

    const overlayRef = this.overlay.create({
      positionStrategy: posStrategy,
      panelClass: cfg.panelClass ?? 'bg-primary shadow-xl rounded-xl option-modal-anim',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    } as OverlayConfig);

    const portal = new ComponentPortal(component, null, this._wrapData(envInjector, cfg.data));
    const compRef = overlayRef.attach(portal);

    let handle!: SmartOverlayHandle<T>;
    const outsideSub = overlayRef.outsidePointerEvents().subscribe(ev => {
      if (anchor.contains(ev.target as Node)) return;
      handle.close();
    });
    const escSub = overlayRef.keydownEvents().subscribe(ev => ev.key === 'Escape' && handle.close());

    handle = {
      overlayRef,
      componentRef: compRef,
      close: () => {
        if (!overlayRef.hasAttached()) return;
        outsideSub.unsubscribe();
        escSub.unsubscribe();
        overlayRef.dispose();
        this.openMap.delete(mapKey);
        cfg.onClose?.();
      },
    };

    this.openMap.set(mapKey, handle);
    return handle;
  }

  openSimple<T>(anchor: HTMLElement, component: Type<T>, env: EnvironmentInjector, data?: Partial<T>) {
    return this.open(anchor, component, env, {
      position: ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      panelClass: ['rounded-2xl', 'border', 'bg-transparent', 'p-0'],
      data
    });
  }

  /* ------------------- Helpers ------------------- */
  private _wrapData(inj: EnvironmentInjector, data: any): Injector {
    return Injector.create({
      parent: inj,
      providers: [{ provide: 'OVERLAY_DATA', useValue: data }],
    });
  }

  private _resolvePositions(pos?: PositionKey | PositionKey[]): ConnectedPosition[] {
    const p = this.GAP;
    const base: Record<PositionKey, ConnectedPosition> = {
      'bottom': { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: p },
      'bottom-start': { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: p },
      'bottom-end': { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: p },

      'top': { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -p },
      'top-start': { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -p },
      'top-end': { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -p },

      'right': { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: p },
      'right-start': { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: p },
      'right-end': { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: p },

      'left': { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -p },
      'left-start': { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -p },
      'left-end': { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -p },
    };

    const fallbacks: Record<PositionKey, PositionKey[]> = {
      'bottom': ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'],
      'bottom-start': ['bottom-start', 'bottom-end', 'bottom', 'top-start', 'top-end', 'top'],
      'bottom-end': ['bottom-end', 'bottom-start', 'bottom', 'top-end', 'top-start', 'top'],

      'top': ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end'],
      'top-start': ['top-start', 'top-end', 'top', 'bottom-start', 'bottom-end', 'bottom'],
      'top-end': ['top-end', 'top-start', 'top', 'bottom-end', 'bottom-start', 'bottom'],

      'right': ['right', 'right-start', 'right-end', 'left', 'left-start', 'left-end'],
      'right-start': ['right-start', 'right-end', 'right', 'left-start', 'left-end', 'left'],
      'right-end': ['right-end', 'right-start', 'right', 'left-end', 'left-start', 'left'],

      'left': ['left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'],
      'left-start': ['left-start', 'left-end', 'left', 'right-start', 'right-end', 'right'],
      'left-end': ['left-end', 'left-start', 'left', 'right-end', 'right-start', 'right'],
    };

    let order: PositionKey[];
    if (Array.isArray(pos) && pos.length) {
      order = pos;
    } else {
      const single = (pos as PositionKey) ?? 'bottom-end';
      order = fallbacks[single];
    }

    const unique = Array.from(new Set(order));
    return unique.map(k => base[k]);
  }
}
