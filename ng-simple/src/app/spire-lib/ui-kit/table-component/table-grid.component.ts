// table-grid.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ElementRef,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  Renderer2,
  SimpleChanges,
  Type
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { OptionItem, OptionListConfig } from '../option-list-components/option-item.model';
import { OptionItemComponent } from "../option-list-components/option-item.component";

/** -------------------- Header/Action/Label content -------------------- */
export type UiContent =
  | string
  | {
      /** Pre-sanitized HTML string (prefer a dedicated component if possible) */
      html?: string;
      /** Render a component with optional input bindings */
      component?: { type: Type<any>; inputs?: Record<string, any> };
    };

/** Content that can depend on the current row */
export type UiContentResolvable<T> = UiContent | ((row: T) => UiContent);

/** -------------------- Cell formatters (unchanged API kept) -------------------- */
export type CellFormatResult =
  | string
  | number
  | {
      text?: string | number | null | undefined;
      html?: string;
      class?: string;
      style?: Record<string, string>;
      component?: { type: Type<any>; inputs?: Record<string, any> };
    };

export type CellFormatter<T> = (ctx: {
  value: any;
  row: T;
  col: TableGridColumn<T>;
  rowIndex: number;
}) => CellFormatResult;

/** -------------------- Columns --------------------------------- */
export interface TableGridColumnBase {
  /** Header label can be text, html, or a component */
  label: UiContent;

  width?: string;
  customClass?: string;
  alignHorizontal?: 'left' | 'center' | 'right';
  alignVertical?: 'top' | 'middle' | 'bottom';
  hidden?: boolean;
  sticky?: 'left' | 'right';
  stickyOffsetPx?: number;
  autoWidth?: boolean;
}

export interface TableGridColumn<T = any> extends TableGridColumnBase {
  field: keyof T | string;
  sortable?: boolean;
  formatter?: CellFormatter<T>;
}

/** -------------------- Actions --------------------------------- */
export interface TableGridActionItem<T = any> {
  /** Fallback textual label (used if content not provided) */
  label?: string;

  /** Button visual classes (Tailwind etc.) */
  colorClass?: string;

  /** Click handler */
  callback: (row: T) => void;

  /** Button body: text | html | component | row => UiContent */
  content?: UiContentResolvable<T>;

  /** Optional accessibility / UX */
  title?: string;
  disabled?: (row: T) => boolean;
}

export interface TableGridAction<T = any> extends TableGridColumnBase {
  /** Per-row action buttons rendered in the Actions column */
  actions?: TableGridActionItem<T>[];

  /** Alternative: render option items instead of buttons */
  optionItems?: OptionItem[] | ((row: T) => OptionItem[]);
  optionItemsWrapperClass?: string;

  sticky?: 'left' | 'right';
  stickyOffsetPx?: number;
  autoWidth?: boolean;
}

/** -------------------- UI / Classes -------------------------------------- */
export interface TableGridUiClasses {
  headerClass?: string;
  headerCellClass?: string;
  headerCellHoverClass?: string;

  /** Base row class (always applied) */
  rowClass?: string;

  /** Programmatic hover visual for the WHOLE row (NO 'hover:'), e.g. 'bg-primary/25' */
  rowHoverClass?: string;

  /** Programmatic hover visual for the SINGLE <td> under pointer (NO 'hover:') */
  cellHoverClass?: string;

  borders?: {
    vertical?: string;
    horizontal?: string;
    headerBottom?: string;
  };
}

/** -------------------- Grid Config -------------------------------------- */
export interface TableGridConfig<T = any> {
  columns: TableGridColumn<T>[];
  actions?: TableGridAction<T>;
  pageSizeOptions?: number[];
  showHeader?: boolean;
  showFooter?: boolean;
  showVerticalLines?: boolean;
  showHorizontalLines?: boolean;
  ariaLabel?: string;
  ui?: TableGridUiClasses;
}


/** -------------------- Component ----------------------------------------- */
@Component({
  selector: 'app-table-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, OptionItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="w-full h-full flex flex-col rounded shadow min-w-[720px] overflow-hidden bg-card text-card-contrast">

  <!-- Rails layout: [left | middle(scroll) | right] -->
  <div class="flex-1 min-h-0">
    <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] h-full gap-0">

      <!-- LEFT rail -->
      @if (leftCols.length > 0) {
        <div class="overflow-hidden">
          <table class="w-full table-auto border-collapse" [attr.aria-label]="config.ariaLabel || 'Data table - left rail'">
            <thead *ngIf="config.showHeader ?? true"
                   class="sticky top-0 z-10 bg-primary text-primary-contrast"
                   [ngClass]="ui.borders.headerBottom">
              <tr [ngClass]="ui.headerClass">
                @for (col of leftCols; track col.field) {
                  <th
                    [style.width]="computeThWidth(col)"
                    [ngClass]="[
                      ui.headerCellClass || '',
                      col.sortable ? (ui.headerCellHoverClass || 'hover:bg-secondary/20') : '',
                      col.alignHorizontal==='center' ? 'text-center' : '',
                      col.alignHorizontal==='right' ? 'text-right' : ''
                    ]"
                    class="py-2 px-4 font-semibold text-sm select-none transition-colors"
                    (click)="col.sortable && onSort(col.field)">
                    <div class="flex items-center gap-1">
                      <!-- LABEL (text | html | component) -->
                      @if (labelText(col.label) !== null) {
                        <span class="truncate">{{ labelText(col.label) }}</span>
                      } @else if (labelHtml(col.label) !== null) {
                        <span class="truncate" [innerHTML]="labelHtml(col.label)"></span>
                      } @else if (labelComponentType(col.label)) {
                        <ng-container
                          [ngComponentOutlet]="labelComponentType(col.label)"
                          [ngComponentOutletInputs]="labelComponentInputs(col.label)">
                        </ng-container>
                      }
                      @if (col.sortable && sortColumn === col.field) {
                        <span>@if (sortDir === 'asc') { &#8593; } @else if (sortDir === 'desc') { &#8595; }</span>
                      }
                    </div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of pageData; track row; let isLastRow = $last; let rowIndex = $index) {
                <tr #leftRow
                    (mouseenter)="onRowEnter(rowIndex)"
                    (mouseleave)="onRowLeave(rowIndex)"
                    [style.height.px]="rowHeights[rowIndex] || null"
                    [ngClass]="[ui.rowClass || '', 'transition-colors']">
                  @for (col of leftCols; track col.field; let isLast = $last) {
                    <td
                      (mouseenter)="onCellEnter($event)"
                      (mouseleave)="onCellLeave($event)"
                      [style.width]="computeTdWidth(col)"
                      [ngClass]="[
                        (config.showVerticalLines && !isLast) ? borders.vertical : '',
                        (config.showHorizontalLines && !isLastRow) ? borders.horizontal : '',
                        col.alignHorizontal==='center' ? 'text-center' : '',
                        col.alignHorizontal==='right' ? 'text-right' : '',
                        col.customClass || ''
                      ]"
                      class="py-1 px-4 text-sm bg-card">
                      <span class="inline-block whitespace-nowrap"
                            [ngClass]="getCellClass(row, col, rowIndex)"
                            [ngStyle]="getCellStyle(row, col, rowIndex)">
                        @if (hasHtml(row, col, rowIndex)) {
                          <span [innerHTML]="getHtml(row, col, rowIndex)"></span>
                        } @else {
                          {{ getText(row, col, rowIndex) }}
                        }
                      </span>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else { <div></div> }

      <!-- MIDDLE rail (scrollable) -->
      <div class="relative overflow-x-auto scrollbar min-w-0">
        <div *ngIf="config.showVerticalLines"
             class="pointer-events-none absolute inset-y-0 right-0 w-px bg-border"></div>

        <table class="w-full table-auto border-collapse" [attr.aria-label]="config.ariaLabel || 'Data table - middle rail'">
          <thead *ngIf="config.showHeader ?? true"
                 class="sticky top-0 z-10 bg-primary text-primary-contrast"
                 [ngClass]="ui.borders.headerBottom">
            <tr [ngClass]="ui.headerClass">
              @for (col of middleCols; track col.field; let isLast = $last) {
                <th
                  [style.width]="computeThWidth(col)"
                  [ngClass]="[
                    ui.headerCellClass || '',
                    col.sortable ? (ui.headerCellHoverClass || 'hover:bg-secondary/20') : '',
                    col.alignHorizontal==='center' ? 'text-center' : '',
                    col.alignHorizontal==='right' ? 'text-right' : ''
                  ]"
                  class="py-2 px-4 font-semibold text-sm select-none transition-colors"
                  (click)="col.sortable && onSort(col.field)">
                  <div class="flex items-center gap-1">
                    <!-- LABEL -->
                    @if (labelText(col.label) !== null) {
                      <span class="truncate">{{ labelText(col.label) }}</span>
                    } @else if (labelHtml(col.label) !== null) {
                      <span class="truncate" [innerHTML]="labelHtml(col.label)"></span>
                    } @else if (labelComponentType(col.label)) {
                      <ng-container
                        [ngComponentOutlet]="labelComponentType(col.label)"
                        [ngComponentOutletInputs]="labelComponentInputs(col.label)">
                      </ng-container>
                    }
                    @if (col.sortable && sortColumn === col.field) {
                      <span>@if (sortDir === 'asc') { &#8593; } @else if (sortDir === 'desc') { &#8595; }</span>
                    }
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading) {
              <tr><td [attr.colspan]="middleCols.length" class="py-8 text-center text-secondary bg-card">Loading…</td></tr>
            } @else if (!loading && pageData.length === 0) {
              <tr><td [attr.colspan]="middleCols.length" class="py-8 text-center text-secondary bg-card">No data found.</td></tr>
            } @else {
              @for (row of pageData; track row; let isLastRow = $last; let rowIndex = $index) {
                <tr #midRow
                    (mouseenter)="onRowEnter(rowIndex)"
                    (mouseleave)="onRowLeave(rowIndex)"
                    [style.height.px]="rowHeights[rowIndex] || null"
                    [ngClass]="[ui.rowClass || '', 'transition-colors']">
                  @for (col of middleCols; track col.field; let isLast = $last) {
                    <td
                      (mouseenter)="onCellEnter($event)"
                      (mouseleave)="onCellLeave($event)"
                      [style.width]="computeTdWidth(col)"
                      [ngClass]="[
                        (config.showVerticalLines && !isLast) ? borders.vertical : '',
                        (config.showHorizontalLines && !isLastRow) ? borders.horizontal : '',
                        col.alignHorizontal==='center' ? 'text-center' : '',
                        col.alignHorizontal==='right' ? 'text-right' : '',
                        col.customClass || ''
                      ]"
                      class="py-1 px-4 text-sm bg-card">
                      <span class="inline-block whitespace-nowrap"
                            [ngClass]="getCellClass(row, col, rowIndex)"
                            [ngStyle]="getCellStyle(row, col, rowIndex)">
                        @if (hasHtml(row, col, rowIndex)) {
                          <span [innerHTML]="getHtml(row, col, rowIndex)"></span>
                        } @else {
                          {{ getText(row, col, rowIndex) }}
                        }
                      </span>
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- RIGHT rail -->
      @if (rightCols.length > 0 || actionsOnRight) {
        <div class="overflow-hidden">
          <table class="w-full table-auto border-collapse" [attr.aria-label]="config.ariaLabel || 'Data table - right rail'">
            <thead *ngIf="config.showHeader ?? true"
                   class="sticky top-0 z-10 bg-primary text-primary-contrast"
                   [ngClass]="ui.borders.headerBottom">
              <tr [ngClass]="ui.headerClass">
                @for (col of rightCols; track col.field) {
                  <th
                    [style.width]="computeThWidth(col)"
                    [ngClass]="[
                      ui.headerCellClass || '',
                      col.sortable ? (ui.headerCellHoverClass || 'hover:bg-secondary/20') : '',
                      col.alignHorizontal==='center' ? 'text-center' : '',
                      col.alignHorizontal==='right' ? 'text-right' : ''
                    ]"
                    class="py-2 px-4 font-semibold text-sm select-none transition-colors"
                    (click)="col.sortable && onSort(col.field)">
                    <div class="flex items-center gap-1">
                      <!-- LABEL -->
                      @if (labelText(col.label) !== null) {
                        <span class="truncate">{{ labelText(col.label) }}</span>
                      } @else if (labelHtml(col.label) !== null) {
                        <span class="truncate" [innerHTML]="labelHtml(col.label)"></span>
                      } @else if (labelComponentType(col.label)) {
                        <ng-container
                          [ngComponentOutlet]="labelComponentType(col.label)"
                          [ngComponentOutletInputs]="labelComponentInputs(col.label)">
                        </ng-container>
                      }
                      @if (col.sortable && sortColumn === col.field) {
                        <span>@if (sortDir === 'asc') { &#8593; } @else if (sortDir === 'desc') { &#8595; }</span>
                      }
                    </div>
                  </th>
                }

                @if (config.actions && actionsOnRight) {
                  <th
                    [style.width]="computeThWidth(config.actions)"
                    [ngClass]="[
                      ui.headerCellClass || '',
                      ui.headerCellHoverClass || '',
                      config.actions.alignHorizontal==='center' ? 'text-center' : '',
                      config.actions.alignHorizontal==='right' ? 'text-right' : ''
                    ]"
                    class="py-2 px-4 font-semibold text-sm">
                    <!-- ACTIONS HEADER LABEL -->
                    @if (labelText(config.actions.label) !== null) {
                      <span class="truncate">{{ labelText(config.actions.label) }}</span>
                    } @else if (labelHtml(config.actions.label) !== null) {
                      <span class="truncate" [innerHTML]="labelHtml(config.actions.label)"></span>
                    } @else if (labelComponentType(config.actions.label)) {
                      <ng-container
                        [ngComponentOutlet]="labelComponentType(config.actions.label)"
                        [ngComponentOutletInputs]="labelComponentInputs(config.actions.label)">
                      </ng-container>
                    }
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of pageData; track row; let isLastRow = $last; let rowIndex = $index) {
                <tr #rightRow
                    (mouseenter)="onRowEnter(rowIndex)"
                    (mouseleave)="onRowLeave(rowIndex)"
                    [style.height.px]="rowHeights[rowIndex] || null"
                    [ngClass]="[ui.rowClass || '', 'transition-colors']">
                  @for (col of rightCols; track col.field; let isLast = $last) {
                    <td
                      (mouseenter)="onCellEnter($event)"
                      (mouseleave)="onCellLeave($event)"
                      [style.width]="computeTdWidth(col)"
                      [ngClass]="[
                        (config.showVerticalLines && !isLast) ? borders.vertical : '',
                        (config.showHorizontalLines && !isLastRow) ? borders.horizontal : '',
                        col.alignHorizontal==='center' ? 'text-center' : '',
                        col.alignHorizontal==='right' ? 'text-right' : '',
                        col.customClass || ''
                      ]"
                      class="py-1 px-4 text-sm bg-card">
                      <span class="inline-block whitespace-nowrap"
                            [ngClass]="getCellClass(row, col, rowIndex)"
                            [ngStyle]="getCellStyle(row, col, rowIndex)">
                        @if (hasHtml(row, col, rowIndex)) {
                          <span [innerHTML]="getHtml(row, col, rowIndex)"></span>
                        } @else {
                          {{ getText(row, col, rowIndex) }}
                        }
                      </span>
                    </td>
                  }

                  @if (config.actions && actionsOnRight) {
                    <td
                      (mouseenter)="onCellEnter($event)"
                      (mouseleave)="onCellLeave($event)"
                      [style.width]="computeTdWidth(config.actions)"
                      [ngClass]="[
                        config.showVerticalLines ? borders.vertical : '',
                        (config.showHorizontalLines && !isLastRow) ? borders.horizontal : '',
                        config.actions.alignHorizontal==='center' ? 'text-center' : '',
                        config.actions.alignHorizontal==='right' ? 'text-right' : ''
                      ]"
                      class="py-1 px-4 whitespace-nowrap bg-card"
                      [class]="config.actions.optionItemsWrapperClass || ''">

                      @if (hasOptionItems(row)) {
                        @for (item of resolveOptionItems(row); track trackItem(item)) {
                          <app-option-item
                            [opt]="item"
                            [config]="optionListConfig"
                            class="inline-flex align-middle me-1"
                          />
                        }
                      } @else {
                        @for (act of (config.actions.actions || []); track act.label) {
                          <button type="button"
                                  (click)="act.callback(row)"
                                  [ngClass]="act.colorClass || 'bg-accent text-light hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent/40'"
                                  class="px-2 py-1 rounded font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed me-1">
                            {{ act.label }}
                          </button>
                        }
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else { <div></div> }

    </div>
  </div>

  <!-- Footer -->
  @if (config.showFooter ?? true) {
    <div class="sticky bottom-0 z-50">
      <div class="flex items-center justify-between py-1 px-3 text-xs h-10 gap-3">
        <span class="text-secondary">
          Page {{ page }} of {{ totalPages }} ({{ totalDisplay }} items)
        </span>

        <div class="flex items-center gap-2">
          @if (pageSizeOptions.length > 1) {
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()"
              class="h-8 px-2 py-1 rounded border border-input-border text-xs bg-input-background text-input-text">
              @for (s of pageSizeOptions; track s) {
                <option [value]="s">{{ s }}/page</option>
              }
            </select>
          }

          <div class="flex items-center gap-1">
            <button (click)="goFirst()" [disabled]="page<=1"
              class="h-8 px-2 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed">«</button>
            <button (click)="prevPage()" [disabled]="page<=1"
              class="h-8 px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed">←</button>

            <input type="number" class="h-8 w-16 px-2 py-1 rounded border border-input-border text-xs bg-input-background text-input-text"
               [ngModel]="page" (ngModelChange)="onPageInput($event)" (keyup.enter)="commitPageInput()"
               min="1" [max]="totalPages" title="Go to page" />

            <button (click)="nextPage()" [disabled]="page>=totalPages"
              class="h-8 px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed">→</button>
            <button (click)="goLast()" [disabled]="page>=totalPages"
              class="h-8 px-2 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed">»</button>
          </div>

          <button (click)="onRefresh()" title="Refresh"
            class="h-8 px-2 py-1 rounded bg-secondary text-secondary-contrast hover:bg-secondary/80">⟳</button>
        </div>
      </div>
    </div>
  }
</div>
  `
})
export class TableGridComponent<T extends Record<string, any>>
  implements OnChanges, AfterViewInit, OnDestroy {

  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0; // 0 or == data.length => client paging; > data.length => server paging
  @Input() loading = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() pageRequest = new EventEmitter<{
    page: number; pageSize: number; sortColumn: string | null; sortDir: 'asc' | 'desc' | null;
  }>();

  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' | null = null;
  totalPages = 1;
  totalDisplay = 0;

  pageSizeOptions: number[] = [10, 20, 50, 100];
  pageData: T[] = [];
  visibleColumns: TableGridColumn<T>[] = [];

  leftCols: TableGridColumn<T>[] = [];
  middleCols: TableGridColumn<T>[] = [];
  rightCols: TableGridColumn<T>[] = [];
  actionsOnLeft = false;
  actionsOnRight = false;

  /** Cross-rail row hover index */
  hoverRowIndex: number | null = null;

  /** Row height sync */
  rowHeights: number[] = [];
  @ViewChildren('leftRow',  { read: ElementRef }) private leftRows!:  QueryList<ElementRef<HTMLTableRowElement>>;
  @ViewChildren('midRow',   { read: ElementRef }) private midRows!:   QueryList<ElementRef<HTMLTableRowElement>>;
  @ViewChildren('rightRow', { read: ElementRef }) private rightRows!: QueryList<ElementRef<HTMLTableRowElement>>;
  private resizeObs?: ResizeObserver;

  private pendingPage: number | null = null;

  constructor(private cdr: ChangeDetectorRef, private renderer: Renderer2) {}

  /** Mode detection */
  private get isClientPaging(): boolean {
    return !this.total || this.total === this.data.length;
  }

  /** UI helpers */
  get ui(): Required<TableGridUiClasses> {
    const d = this.defaultUi;
    const u = this.config.ui ?? {};
    return {
      headerClass: u.headerClass ?? d.headerClass,
      headerCellClass: u.headerCellClass ?? d.headerCellClass,
      headerCellHoverClass: u.headerCellHoverClass ?? d.headerCellHoverClass,
      rowClass: u.rowClass ?? d.rowClass,
      rowHoverClass: u.rowHoverClass ?? d.rowHoverClass,
      cellHoverClass: u.cellHoverClass ?? d.cellHoverClass,
      borders: {
        vertical: u.borders?.vertical ?? d.borders!.vertical!,
        horizontal: u.borders?.horizontal ?? d.borders!.horizontal!,
        headerBottom: u.borders?.headerBottom ?? d.borders!.headerBottom!,
      }
    };
  }

  private readonly defaultUi: Required<TableGridUiClasses> = {
    headerClass: '',
    headerCellClass: '',
    headerCellHoverClass: 'hover:bg-secondary/20',
    rowClass: '',
    // non-hover; applied programmatically to all rails for the same row index
    rowHoverClass: 'bg-primary/15',
    // non-hover; applied only to the specific <td> on pointer hover (empty => disabled)
    cellHoverClass: 'bg-primary/20',
    borders: {
      vertical: 'border-r border-primary',
      horizontal: 'border-b border-primary',
      headerBottom: 'border-b border-primary'
    }
  };
  get borders() { return this.ui.borders!; }

  optionListConfig: OptionListConfig = { showIcon: true, showLabel: true };

  /** -------- label helpers (text | html | component) -------- */
  labelText(v: UiContent): string | null {
    return (typeof v === 'string') ? v : null;
  }
  labelHtml(v: UiContent): string | null {
    return (typeof v === 'object' && !!v?.html && !v?.component) ? v.html! : null;
  }
  labelComponentType(v: UiContent): Type<any> | null {
    return (typeof v === 'object' && !!v?.component?.type) ? v.component.type : null;
  }
  labelComponentInputs(v: UiContent): Record<string, any> | undefined {
    return (typeof v === 'object' && !!v?.component?.inputs) ? v.component.inputs : undefined;
  }

  /** ---------------- Lifecycle ---------------- */
  ngOnChanges(changes: SimpleChanges): void {
    this.visibleColumns = (this.config.columns ?? []).filter(c => !c.hidden);
    this.leftCols = this.visibleColumns.filter(c => c.sticky === 'left');
    this.rightCols = this.visibleColumns.filter(c => c.sticky === 'right');
    this.middleCols = this.visibleColumns.filter(c => !c.sticky);

    const act = this.config.actions;
    const where = act ? (act.sticky ?? 'right') : null;
    this.actionsOnLeft = where === 'left';
    this.actionsOnRight = where === 'right';

    this.pageSizeOptions = this.config.pageSizeOptions ?? this.pageSizeOptions;

    this.updateDisplay(true);
    this.queueSync();
  }

  ngAfterViewInit(): void {
    // Keep heights in sync
    this.resizeObs = new ResizeObserver(() => this.queueSync());
    const attach = (q: QueryList<ElementRef>) => q.changes.subscribe(() => {
      this.queueSync();
      this.syncActiveHover();  // re-apply row classes to new DOM nodes
    });
    attach(this.leftRows); attach(this.midRows); attach(this.rightRows);
    this.queueSync();
  }

  ngOnDestroy(): void {
    this.resizeObs?.disconnect?.();
  }

  /** ---------------- Paging / Sort ---------------- */
  private updateDisplay(_: boolean = false) {
    const items = [...this.data];

    if (this.isClientPaging) {
      let sorted = items;
      if (this.sortColumn) {
        const f = this.sortColumn as keyof T;
        const dir = this.sortDir === 'asc' ? 1 : -1;
        sorted = [...items].sort((a, b) => {
          const av = (a as any)[f], bv = (b as any)[f];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return av > bv ? dir : av < bv ? -dir : 0;
        });
      }
      const totalCount = sorted.length;
      this.totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, this.pageSize)));
      if (this.page > this.totalPages) this.page = this.totalPages;
      if (this.page < 1) this.page = 1;

      const start = (this.page - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.pageData = sorted.slice(start, end);
      this.totalDisplay = totalCount;
    } else {
      // server-paged mode
      this.pageData = items;
      this.totalPages = Math.max(1, Math.ceil(this.total / Math.max(1, this.pageSize)));
      if (this.page > this.totalPages) this.page = this.totalPages;
      if (this.page < 1) this.page = 1;
      this.totalDisplay = this.total || items.length;
    }

    this.cdr.markForCheck();
  }

  onRefresh() { this.refresh.emit(); }

  onSort(field: string | keyof T) {
    if (this.sortColumn === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : this.sortDir === 'desc' ? null : 'asc';
      if (!this.sortDir) this.sortColumn = null;
    } else {
      this.sortColumn = field as string; this.sortDir = 'asc';
    }
    this.page = 1;
    this.updateDisplay();
    this.emitPageRequest(); // parent may fetch server-side sorted page
    this.queueSync();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.updateDisplay();
      this.emitPageRequest();
    }
  }
  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.updateDisplay();
      this.emitPageRequest();
    }
  }
  goFirst() {
    if (this.page !== 1) {
      this.page = 1;
      this.updateDisplay();
      this.emitPageRequest();
    }
  }
  goLast() {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.updateDisplay();
      this.emitPageRequest();
    }
  }
  onPageSizeChange() {
    this.page = 1;
    this.updateDisplay();
    this.emitPageRequest();
  }
  onPageInput(v: number) { this.pendingPage = Number.isFinite(+v) ? +v : this.page; }
  commitPageInput() {
    const p = this.pendingPage ?? this.page;
    const clamped = Math.min(this.totalPages, Math.max(1, Math.floor(p)));
    if (clamped !== this.page) {
      this.page = clamped;
      this.updateDisplay();
      this.emitPageRequest();
    }
    this.pendingPage = null;
  }
  private emitPageRequest() {
    this.pageRequest.emit({
      page: this.page, pageSize: this.pageSize, sortColumn: this.sortColumn, sortDir: this.sortDir
    });
    this.queueSync();
  }

  /** ---------------- Width helpers ---------------- */
  computeThWidth(col: TableGridColumnBase | TableGridAction<T>): string | null {
    return col.autoWidth ? '1%' : (col.width || null);
  }
  computeTdWidth(col: TableGridColumnBase | TableGridAction<T>): string | null {
    return col.autoWidth ? '1%' : (col.width || null);
  }

  /** ---------------- Cross-rail ROW hover ---------------- */
  onRowEnter(index: number) {
    this.hoverRowIndex = index;
    this.applyRowHover(index);
  }
  onRowLeave(index: number) {
    // If the same index is still hovered in any rail, keep row hover active
    const hovered =
      [this.leftRows, this.midRows, this.rightRows].some(list => {
        const el = list?.get(index)?.nativeElement as HTMLElement | undefined;
        return !!el && el.matches(':hover');
      });
    if (!hovered) {
      this.removeRowHover(index);
      this.hoverRowIndex = null;
    }
  }

  private getRow(q: QueryList<ElementRef<HTMLTableRowElement>>, i: number) {
    return q?.get(i)?.nativeElement as HTMLTableRowElement | undefined;
  }

  private addClasses(el: HTMLElement | null | undefined, classes: string | undefined) {
    if (!el || !classes) return;
    classes.split(/\s+/).filter(Boolean).forEach(cls => this.renderer.addClass(el, cls));
  }
  private removeClasses(el: HTMLElement | null | undefined, classes: string | undefined) {
    if (!el || !classes) return;
    classes.split(/\s+/).filter(Boolean).forEach(cls => this.renderer.removeClass(el, cls));
  }
  private forRow(row: HTMLTableRowElement | undefined, fn: (el: HTMLElement) => void) {
    if (!row) return;
    fn(row);
  }

  private applyRowHover(index: number) {
    const rowCls = this.ui.rowHoverClass;
    const rows = [
      this.getRow(this.leftRows, index),
      this.getRow(this.midRows, index),
      this.getRow(this.rightRows, index),
    ];
    rows.forEach(r => this.forRow(r, el => this.addClasses(el, rowCls)));
  }

  private removeRowHover(index: number) {
    const rowCls = this.ui.rowHoverClass;
    const rows = [
      this.getRow(this.leftRows, index),
      this.getRow(this.midRows, index),
      this.getRow(this.rightRows, index),
    ];
    rows.forEach(r => this.forRow(r, el => this.removeClasses(el, rowCls)));
  }

  /** Re-apply row hover after DOM changes (paging/sorting/resize) */
  private syncActiveHover() {
    if (this.hoverRowIndex == null) return;
    this.applyRowHover(this.hoverRowIndex);
  }

  /** ---------------- SINGLE-CELL hover (local to the td under pointer) ---------------- */
  onCellEnter(ev: Event) {
    const cls = this.ui.cellHoverClass?.trim();
    if (!cls) return;
    const el = ev.currentTarget as HTMLElement | null;
    if (!el) return;
    this.addClasses(el, cls);
  }

  onCellLeave(ev: Event) {
    const cls = this.ui.cellHoverClass?.trim();
    if (!cls) return;
    const el = ev.currentTarget as HTMLElement | null;
    if (!el) return;
    this.removeClasses(el, cls);
  }

  /** ---------------- Cell formatting ---------------- */
  private getFormatResult(row: T, col: TableGridColumn<T>, rowIndex: number): CellFormatResult {
    const raw = (row as any)[col.field as string];
    return typeof col.formatter === 'function'
      ? col.formatter({ value: raw, row, col, rowIndex })
      : (raw ?? '—');
  }
  getText(row: T, col: TableGridColumn<T>, rowIndex: number): string | number {
    const r = this.getFormatResult(row, col, rowIndex);
    if (typeof r === 'string' || typeof r === 'number') return r;
    if (r && typeof r === 'object') return r.html ? '' : (r.text ?? '—') as any;
    return '—';
  }
  getHtml(row: T, col: TableGridColumn<T>, rowIndex: number): string {
    const r = this.getFormatResult(row, col, rowIndex);
    return typeof r === 'object' && !!r?.html ? r.html! : '';
  }
  hasHtml(row: T, col: TableGridColumn<T>, rowIndex: number) {
    const r = this.getFormatResult(row, col, rowIndex);
    return typeof r === 'object' && !!r?.html;
  }
  getCellClass(row: T, col: TableGridColumn<T>, rowIndex: number) {
    const r = this.getFormatResult(row, col, rowIndex);
    return typeof r === 'object' ? (r.class ?? undefined) : undefined;
  }
  getCellStyle(row: T, col: TableGridColumn<T>, rowIndex: number) {
    const r = this.getFormatResult(row, col, rowIndex);
    return typeof r === 'object' ? (r.style ?? null) : null;
  }

  /** ---------------- Actions as OptionItems ---------------- */
  hasOptionItems = (row: T) =>
    !!this.config.actions?.optionItems &&
    (Array.isArray(this.config.actions.optionItems) ? this.config.actions.optionItems.length > 0 : true);

  resolveOptionItems(row: T): OptionItem[] {
    const src = this.config.actions?.optionItems;
    if (!src) return [];
    const items = Array.isArray(src) ? src : src(row);
    return items.map(i => {
      if ((i as any).component && !(i as any).componentInputs) {
        (i as any).componentInputs = { row };
      }
      return i;
    });
  }

  trackItem(item: OptionItem) {
    return (item as any).id ?? (item as any).label ?? (item as any).component ?? JSON.stringify(item);
  }

  /** ---------------- Row height sync ---------------- */
  private queueSync() {
    requestAnimationFrame(() => this.syncRowHeights());
  }

  private syncRowHeights() {
    const maxRows = Math.max(
      this.leftRows?.length ?? 0,
      this.midRows?.length ?? 0,
      this.rightRows?.length ?? 0
    );
    const heights: number[] = new Array(maxRows).fill(0);

    for (let i = 0; i < maxRows; i++) {
      const hLeft  = this.leftRows?.get(i)?.nativeElement.getBoundingClientRect().height ?? 0;
      const hMid   = this.midRows?.get(i)?.nativeElement.getBoundingClientRect().height ?? 0;
      const hRight = this.rightRows?.get(i)?.nativeElement.getBoundingClientRect().height ?? 0;
      heights[i] = Math.max(hLeft, hMid, hRight);
    }

    this.rowHeights = heights;
    this.cdr.markForCheck();

    if (this.resizeObs) {
      [...(this.leftRows || []), ...(this.midRows || []), ...(this.rightRows || [])]
        .forEach(ref => this.resizeObs!.observe(ref.nativeElement));
    }

    // After any resync, ensure the current hovered row is visually active everywhere
    this.syncActiveHover();
  }
}
