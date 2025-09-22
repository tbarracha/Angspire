// option-item-list.component.ts
import { Component, Input, EnvironmentInjector, createComponent } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { OptionItemComponent } from './option-item.component';
import { OptionListGroup, OptionListConfig, OptionItem } from './option-item.model';

export interface OpenAsPopoverOptions {
  /** Mouse event (preferred) or coordinates */
  event?: MouseEvent;
  x?: number;
  y?: number;

  groups: OptionListGroup[];
  config?: OptionListConfig;
  iconContainerSize?: string;
  expanded?: boolean | null;
  /** If true (default), the popover closes after any item onClick runs */
  autoCloseOnItemClick?: boolean;

  /** Needed when this component is standalone */
  environmentInjector: EnvironmentInjector;

  /** Styling/positioning */
  classList?: string[];
  align?: 'cursor' | 'target-right' | 'target-bottom';
  offset?: { x?: number; y?: number };

  /** Callback on teardown */
  onClose?: () => void;
}

@Component({
  selector: 'app-option-item-list',
  standalone: true,
  imports: [NgIf, NgFor, OptionItemComponent],
  template: `
<ng-container *ngFor="let g of groups">
  <ng-container *ngIf="g.title">
    <div class="w-full max-w-full">
      <app-option-item
        [opt]="g.title"
        [config]="config"
        [group]="g"
        [iconContainerSize]="iconContainerSize"
        [expanded]="expanded"
        [isTitle]="true"
      ></app-option-item>
    </div>
  </ng-container>

  <div *ngFor="let opt of g.items" class="w-full max-w-full">
    <app-option-item
      [opt]="opt"
      [config]="config"
      [group]="g"
      [iconContainerSize]="iconContainerSize"
      [expanded]="expanded"
    ></app-option-item>
  </div>
</ng-container>
  `
})
export class OptionItemListComponent {
  @Input() groups?: OptionListGroup[];
  @Input() config?: OptionListConfig;
  @Input() iconContainerSize = '40px';
  @Input() expanded: boolean | null = null;

  /** Small portal helper */
  static openAsPopover(opts: OpenAsPopoverOptions) {
    const {
      environmentInjector,
      groups,
      config,
      iconContainerSize = '40px',
      expanded = null,
      classList = ['bg-primary', 'shadow-xl', 'rounded-xl'],
      align = 'cursor',
      offset = { x: 8, y: 4 },
      onClose,
      autoCloseOnItemClick = true,
    } = opts;

    // --- Position ---------------------------------------------------
    const targetEl = (opts.event?.target as HTMLElement | undefined) ?? undefined;
    let left = opts.x ?? opts.event?.clientX ?? 0;
    let top  = opts.y ?? opts.event?.clientY ?? 0;

    if (align !== 'cursor' && targetEl) {
      const r = targetEl.getBoundingClientRect();
      if (align === 'target-right') { left = r.right + (offset.x ?? 0); top = r.top + (offset.y ?? 0); }
      else if (align === 'target-bottom') { left = r.left + (offset.x ?? 0); top = r.bottom + (offset.y ?? 0); }
    } else {
      left += (offset.x ?? 0); top += (offset.y ?? 0);
    }

    // --- Host wrapper ----------------------------------------------
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = `${Math.round(left)}px`;
    wrapper.style.top = `${Math.round(top)}px`;
    wrapper.style.zIndex = '9999';
    wrapper.style.maxWidth = 'min(320px, 90vw)';
    wrapper.style.maxHeight = 'min(80vh, 600px)';
    wrapper.style.overflow = 'auto';
    wrapper.classList.add(...classList);

    // We assign close() later but need it available for item wrappers.
    let closeRef: (() => void) | null = null;

    // Wrap only simple clickable items with onClick; skip component items.
    const wrappedGroups: OptionListGroup[] = autoCloseOnItemClick
      ? groups.map((g): OptionListGroup => ({
          ...g,
          items: g.items.map((it): OptionItem => {
            const isComponentItem = (it as any).component != null;
            const original = (it as any).onClick as (undefined | (() => void));
            const canWrap = !isComponentItem && typeof original === 'function';
            if (!canWrap) return it as OptionItem;

            const wrapped = {
              ...(it as any),
              onClick: () => {
                try { original?.(); }
                finally { setTimeout(() => closeRef?.(), 0); }
              }
            };
            return wrapped as OptionItem;
          })
        }))
      : groups;

    // --- Create component in wrapper --------------------------------
    const compRef = createComponent(OptionItemListComponent, {
      hostElement: wrapper,
      environmentInjector
    });
    compRef.instance.groups = wrappedGroups;
    compRef.instance.config = config;
    compRef.instance.iconContainerSize = iconContainerSize;
    compRef.instance.expanded = expanded;
    compRef.changeDetectorRef.detectChanges();

    document.body.appendChild(wrapper);

    // --- Close mechanics --------------------------------------------
    const close = () => {
      document.removeEventListener('click', onDocClick, true);
      window.removeEventListener('keydown', onKey);
      try { compRef.destroy(); } catch { /* ignore */ }
      try { wrapper.remove(); } catch { /* ignore */ }
      onClose?.();
    };
    closeRef = close;

    const onDocClick = (ev: MouseEvent) => {
      if (!wrapper.contains(ev.target as Node)) close();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close();
    };

    document.addEventListener('click', onDocClick, true);
    window.addEventListener('keydown', onKey);

    return { close };
  }
}
