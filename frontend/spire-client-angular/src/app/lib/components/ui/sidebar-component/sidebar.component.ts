import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IToggleable, ToggleService } from '../../../modules/toggles/toggle.service';
import { SidebarComponentConfigs } from './sidebar-option.model';

const COLLAPSE_ANIMATION_DURATION = 300;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
<aside
  class="overflow-hidden transition-width duration-300 h-full flex flex-col"
  [ngClass]="[
    configs?.side === 'right' ? 'right-0' : 'left-0',
    isToggled ? 'expanded' : 'collapsed'
  ]"
  [style.width]="sidebarWidth"
>
  <!-- Slot for top/above content (e.g. search bar, toggle, etc.) -->
  <ng-content select="[sidebar-top]"></ng-content>

  <!-- Main flexible content (e.g. your list, forms, custom UI) -->
  <div class="flex-1 flex flex-col w-full overflow-hidden">
    <ng-content></ng-content>
  </div>

  <!-- Slot for bottom content (e.g. actions, copyright, etc.) -->
  <ng-content select="[sidebar-bottom]"></ng-content>
</aside>
  `
})
export class SidebarComponent implements IToggleable, OnInit, OnDestroy {
  private toggleService = inject(ToggleService);

  @Input() id!: string;
  @Input() configs?: SidebarComponentConfigs = {
    isExpandable: true,
    collapsedWidth: '40px',
    expandedWidth: '240px',
    iconContainerSize: '40px',
    iconSize: '32px',
    labelWidth: '200px',
    side: 'left',
  };

  private _toggled = signal(false);
  hideLabels = false;
  private collapseTimer: any;

  get isToggled(): boolean { return this._toggled(); }
  get isExpandable(): boolean { return this.configs?.isExpandable !== false; }
  get showToggleButton(): boolean { return this.configs?.showToggleButton !== false; }
  get sidebarWidth(): string {
    if (!this.isExpandable) return this.configs?.expandedWidth ?? '12rem';
    return this.isToggled
      ? this.configs?.expandedWidth ?? '12rem'
      : this.configs?.collapsedWidth ?? '2.5rem';
  }

  toggle = () => {
    if (this.isExpandable) {
      if (this.isToggled) {
        this._toggled.set(false);
        this.collapseTimer = setTimeout(() => { this.hideLabels = true; }, COLLAPSE_ANIMATION_DURATION);
      } else {
        this.hideLabels = false;
        this._toggled.set(true);
        if (this.collapseTimer) clearTimeout(this.collapseTimer);
      }
    }
  };

  ngOnInit() {
    if (!this.isExpandable) {
      this._toggled.set(false);
      this.hideLabels = true;
    } else if (!this.isToggled) {
      this.hideLabels = true;
    }
    this.toggleService.register(this);
  }
  ngOnDestroy() {
    this.toggleService.unregister(this.id);
    if (this.collapseTimer) clearTimeout(this.collapseTimer);
  }
}
