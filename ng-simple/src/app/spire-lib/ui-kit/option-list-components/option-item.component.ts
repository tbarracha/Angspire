import { Component, Input, Type } from '@angular/core';
import {
  OptionListConfig,
  OptionListGroup,
  OptionItem
} from './option-item.model';
import { CommonModule } from '@angular/common';

// Patterns for overridable utilities, with key extractor
const OVERRIDE_PATTERNS: [RegExp, (cls: string) => string][] = [
  // [Pattern, function to extract the override key]
  [/^bg-[\w/-]+$/, cls => 'bg'],
  [/^text-[\w/-]+$/, cls => 'text'],
  [/^group-hover:bg-[\w/-]+$/, cls => 'group-hover:bg'],
  [/^group-hover:text-[\w/-]+$/, cls => 'group-hover:text'],
  [/^hover:bg-[\w/-]+$/, cls => 'hover:bg'],
  [/^hover:text-[\w/-]+$/, cls => 'hover:text'],
  // Add more as needed
];

// Merge with precise override: only same utility (e.g., group-hover:bg) is replaced.
function mergeOverrideClasses(...classLists: (string | string[] | undefined)[]): string[] {
  const allClasses = classLists.flatMap(
    c => Array.isArray(c) ? c : typeof c === 'string' ? c.split(/\s+/) : []
  );
  const overrideMap = new Map<string, string>();
  const result: string[] = [];
  for (const cls of allClasses) {
    let overridden = false;
    for (const [pattern, getKey] of OVERRIDE_PATTERNS) {
      if (pattern.test(cls)) {
        overrideMap.set(getKey(cls), cls);
        overridden = true;
        break;
      }
    }
    if (!overridden) {
      // For classes not matched by override patterns, use full class as key
      overrideMap.set(cls, cls);
    }
  }
  // Preserve insertion order (bottom-up): config, group, item
  return Array.from(overrideMap.values());
}


@Component({
  selector: 'app-option-item',
  standalone: true,
  imports: [CommonModule],
  template: `
<div
  class="relative flex items-center w-full max-w-full flex-1 min-w-0 group transition"
  [class.cursor-pointer]="isClickable(opt)"
  (click)="handleClick()"
  [style.height]="iconContainerSize"
  [style.minHeight]="iconContainerSize"
  [style.maxHeight]="iconContainerSize"
  [ngClass]="wrapperClasses"
  [style.width]="rowWidthToUse"
>
  <!-- BACKGROUND -->
  <div class="absolute inset-0 pointer-events-none transition duration-150" [ngClass]="bgClasses"></div>

  <!-- ICON / COMPONENT (renders only when hasIcon === true) -->
  <span
    *ngIf="effectiveShowIcon && hasIcon"
    class="flex items-center justify-center relative z-10"
    [style.width]="iconContainerSize"
    [style.height]="iconContainerSize"
  >
    @if (effectiveIconComponent) {
      <ng-container
        *ngComponentOutlet="effectiveIconComponent; inputs: opt.iconComponentInputs"
      ></ng-container>
    } @else if (opt.icon) {
      <i
        [ngClass]="opt.icon"
        [style.fontSize]="iconSize"
        [style.width]="iconSize"
        [style.height]="iconSize"
      ></i>
    } @else if (opt.emoji) {
      <span
        [ngClass]="opt.icon"
        [style.fontSize]="iconSize"
        [style.width]="iconSize"
        [style.height]="iconSize"
      >{{ opt.emoji }}</span>
    } @else {
      <!-- Optionally, render nothing or a fallback -->
    }
  </span>

  <!-- LABEL / ROW COMPONENT -->
  <span class="flex-1 transition-all duration-300 overflow-hidden relative z-10">
    <ng-container *ngIf="isComponentOption(); else labelBlock">
      <div
        class="w-full max-w-full flex items-center"
        [style.height]="iconContainerSize"
        [ngClass]="{
          'opacity-100': effectiveShowLabel,
          'opacity-0 ps-0': !effectiveShowLabel
        }"
      >
        <ng-container
          *ngComponentOutlet="opt.component ?? null; inputs: opt.componentInputs"
        ></ng-container>
      </div>
    </ng-container>

    <ng-template #labelBlock>
      <div
        *ngIf="effectiveShowLabel"
        class="flex px-2 items-center whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300"
        [style.height]="iconContainerSize"
        [ngClass]="{
          'opacity-100': effectiveShowLabel,
          'opacity-0 ps-0': !effectiveShowLabel
        }"
      >
        {{ opt.label }}
      </div>
    </ng-template>
  </span>
</div>
  `
})
export class OptionItemComponent {
  @Input() opt!: OptionItem;
  @Input() config?: OptionListConfig;
  @Input() group?: OptionListGroup;
  @Input() isTitle: boolean = false;

  @Input() iconContainerSize = '40px';
  @Input() iconSize = '32px';
  @Input() expanded: boolean | null = null;

  // Normalized/merged property helpers (row > group > config > fallback)
  get effectiveShowLabel(): boolean {
    return (
      this.opt.showLabel ??
      this.group?.showLabel ??
      this.config?.showLabel ??
      true // fallback: always show
    );
  }
  get effectiveShowIcon(): boolean {
    return (
      this.opt.showIcon ??
      this.group?.showIcon ??
      this.config?.showIcon ??
      true // fallback: always show
    );
  }
  get rowWidthToUse(): string | null {
    return (
      this.opt.rowWidth ??
      this.group?.rowWidth ??
      this.config?.rowWidth ??
      null
    );
  }
  get labelWidthToUse(): string | null {
    return (
      this.opt.labelWidth ??
      this.group?.labelWidth ??
      this.config?.labelWidth ??
      null
    );
  }

  isClickable(opt: OptionItem = this.opt): boolean {
    return typeof (opt as any).onClick === 'function';
  }

  handleClick() {
    if (this.isClickable()) (this.opt as any).onClick();
  }

  isComponentOption(opt: OptionItem = this.opt): boolean {
    return !!(opt as any).component;
  }

  get effectiveIconComponent(): Type<any> | null {
    if (this.expanded === true && this.opt.iconComponentExpanded)
      return this.opt.iconComponentExpanded;
    if (this.expanded === false && this.opt.iconComponentCollapsed)
      return this.opt.iconComponentCollapsed;
    return this.opt.iconComponent || null;
  }

  get hasIcon(): boolean {
    const iconStr = (this.opt.icon ?? '').toLowerCase();
    if (iconStr === 'hidden' || iconStr === 'null' || iconStr === '') {
      return !!this.effectiveIconComponent;
    }
    return true;
  }

  // ---------------------- OVERRIDABLE CLASS MERGE ---------------------------

  get wrapperClasses(): string[] {
    return mergeOverrideClasses(
      this.config?.classes?.textClasses,
      this.group?.classes?.textClasses,
      this.opt.classes?.textClasses,
      this.expanded ? this.config?.classes?.textExpandedClasses : undefined,
      this.expanded ? this.group?.classes?.textExpandedClasses : undefined,
      this.expanded ? this.opt.classes?.textExpandedClasses : undefined,
    );
  }

  get bgClasses(): string[] {
    const merged = mergeOverrideClasses(
      this.config?.classes?.bgClasses,
      this.group?.classes?.bgClasses,
      this.opt.classes?.bgClasses,
      this.expanded ? this.config?.classes?.bgExpandedClasses : undefined,
      this.expanded ? this.group?.classes?.bgExpandedClasses : undefined,
      this.expanded ? this.opt.classes?.bgExpandedClasses : undefined,
    );
    return merged.length ? merged : ['hover:bg-neutral-100'];
  }
}
