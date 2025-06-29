import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TableGridColumn<T = any> {
  field: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
}

export interface TableGridConfig<T = any> {
  columns: TableGridColumn<T>[];
  pageSizeOptions?: number[];
  actions?: {
    label: string;
    icon?: string;
    callback: (row: T) => void;
    colorClass?: string;
  }[];
  showHeader?: boolean;
  showFooter?: boolean;
  showVerticalLines?: boolean;
  showHorizontalLines?: boolean;
}

@Component({
  selector: 'app-table-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="w-full h-full flex flex-col rounded shadow min-w-[720px] overflow-hidden bg-card text-card-contrast relative">
    <!-- ----- Scroll Container ----- -->
    <div #scrollRef
         class="flex-1 min-h-0 overflow-x-auto relative"
         (scroll)="updateResizerHandles()">

      <!-- guide line while dragging -->
      <div *ngIf="resizingActive"
           class="pointer-events-none absolute top-0 h-full w-0.5 bg-accent opacity-80 z-50"
           [style.left.px]="resizeLinePx"></div>

      <!------- Table -------->
      <table class="w-full min-w-max table-fixed">
        <thead *ngIf="config?.showHeader ?? true"
               class="sticky top-0 z-10 bg-highlight border-b border-border">
          <tr>
            <ng-container *ngFor="let col of config.columns; let idx = index; trackBy: trackByField">
              <th #headerCell
                  class="py-2 px-4 font-semibold text-sm text-left bg-secondary/50 text-highlight-contrast border-0 relative select-none group"
                  [style.width]="col.width"
                  [ngClass]="{
                    'cursor-pointer': col.sortable,
                    'hover:bg-primary hover:text-secondary-contrast': (col.sortable && !resizingActive),
                    'border-r border-border': config.showVerticalLines
                  }"
                  (mousedown)="col.sortable && sortBy(col)">
                <div class="flex items-center">
                  <span class="truncate">{{ col.label }}</span>
                  <span *ngIf="col.sortable" class="ml-1">
                    <ng-container *ngIf="sortColumn === col.field">
                      <span *ngIf="sortDir==='asc'">&#8593;</span>
                      <span *ngIf="sortDir==='desc'">&#8595;</span>
                    </ng-container>
                  </span>
                </div>
              </th>
            </ng-container>

            <th *ngIf="config.actions?.length"
                #actionsHeader
                class="py-2 px-4 font-semibold text-right text-sm bg-secondary/50 text-highlight-contrast border-0"
                [style.width.px]="actionsWidth">
              Actions
            </th>
          </tr>

          <!-- ----- Handles Overlay ----- -->
          <div class="absolute top-0 left-0 h-full w-full z-30 pointer-events-none"
               *ngIf="resizerHandles.length">
            <div *ngFor="let h of resizerHandles"
                 class="absolute top-0 h-full w-2 -translate-x-1/2 cursor-col-resize bg-transparenn pointer-events-auto"
                 [style.left.px]="h.x"
                 (mousedown)="startResize($event, h.idx)"
                 (click)="$event.stopPropagation()">
            </div>
          </div>
        </thead>

        <!-- BODY (unchanged) -->
        <tbody>
          <!-- … loading / empty rows … -->
          <tr *ngIf="loading">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted bg-card">Loading…</td>
          </tr>
          <tr *ngIf="!loading && pageData.length === 0">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted bg-card">No data found.</td>
          </tr>

          <tr *ngFor="let row of pageData" class="hover:bg-highlight transition">
            <ng-container *ngFor="let col of config.columns; trackBy: trackByField">
              <td class="py-1 px-4 truncate text-sm border-0"
                  [style.width]="col.width"
                  [ngClass]="{'border-r border-border': config.showVerticalLines}">
                {{ row[col.field] ?? '—' }}
              </td>
            </ng-container>
            <td *ngIf="config.actions?.length"
                class="py-1 px-4 text-right space-x-1 border-0"
                [style.width.px]="actionsWidth">
              <ng-container *ngFor="let act of config.actions">
                <button type="button"
                        class="px-2 py-1 rounded font-semibold text-sm transition"
                        [ngClass]="act.colorClass || 'bg-primary text-primary-contrast hover:bg-secondary hover:text-secondary-contrast'"
                        (click)="act.callback(row)">
                  {{ act.label }}
                </button>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FOOTER -->
    <ng-container *ngIf="config?.showFooter ?? true">
      <div class="sticky bottom-0 z-10 bg-card border-t border-border">
        <div class="flex items-center justify-between py-2 px-4">
          <span class="text-secondary text-xs">Page {{ page }} of {{ totalPages }} ({{ total }} items)</span>
          <div class="flex items-center gap-2">
            <!-- Page Size Dropdown -->
            <select *ngIf="pageSizeOptions.length > 1"
                    [(ngModel)]="pageSize"
                    (change)="updatePagedData()"
                    class="h-8 px-2 py-1 rounded border border-input-border text-xs bg-input-background text-input-text focus:outline-none">
              <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}/page</option>
            </select>
            
            <!-- Refresh Button -->
            <button type="button"
                    title="Refresh"
                    class="h-8 px-2 py-1 rounded bg-secondary text-secondary-contrast hover:bg-secondary/80 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Pagination Buttons -->
            <button class="h-8 px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80"
                    [disabled]="page <= 1"
                    (click)="prevPage()">
              &larr;
            </button>
            <button class="h-8 px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80"
                    [disabled]="page >= totalPages"
                    (click)="nextPage()">
              &rarr;
            </button>
          </div>
        </div>
      </div>
    </ng-container>
  </div>
  `
})
export class TableGridComponent<T extends Record<string, any>> implements OnChanges, AfterViewInit {
  /* ---------------------------- Inputs & Outputs ---------------------------- */
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();


  /* ---------------------------- Template References ------------------------- */
  @ViewChild('scrollRef', { static: false }) scrollRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('headerCell') headerCells!: QueryList<ElementRef<HTMLTableCellElement>>;
  @ViewChild('actionsHeader', { static: false }) actionsHeaderCell!: ElementRef<HTMLTableCellElement>;


  /* ---------------------------- Paging & Sorting State ---------------------- */
  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' | null = null;

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;
  totalPages = 1;
  pageData: T[] = [];


  /* ---------------------------- Resizing State ------------------------------ */
  resizerHandles: { idx: number; x: number }[] = [];

  resizingActive = false;
  leftColIdx = -1;
  startX = 0;

  leftStartW = 0;
  rightStartW = 0;
  rightMinW = 48;

  resizeLinePx = 0;
  startLineOffset = 0;

  actionsWidth = 120;


  /* ---------------------------- Lifecycle ----------------------------------- */

  ngOnChanges() {
    this.ensureWidths();
    this.updatePagedData();
    this.updateResizerHandles();
  }

  ngAfterViewInit() {
    requestAnimationFrame(() => {
      this.setInitialColumnWidths();
      this.updateResizerHandles();
    });
  }


  /* ---------------------------- Utility ----------------------------------- */

  onRefresh() {
    this.refresh.emit();
  }

  trackByField(_: number, col: TableGridColumn<T>) {
    return col.field;
  }

  ensureWidths() {
    if (!this.config?.columns) return;
    this.config.columns.forEach((c: TableGridColumn<T>) => {
      if (!c.width) c.width = '160px';
    });
  }

  private setInitialColumnWidths() {
    if (!this.headerCells?.length || !this.config?.columns) return;

    this.headerCells.forEach((cellRef, idx) => {
      const cellEl = cellRef.nativeElement;
      const width = cellEl.getBoundingClientRect().width;
      this.config.columns[idx].width = `${width}px`;
    });

    if (this.actionsHeaderCell) {
      const actionsWidth = this.actionsHeaderCell.nativeElement.getBoundingClientRect().width;
      this.actionsWidth = actionsWidth;
    }
  }


  /* ---------------------------- Sorting ----------------------------------- */

  sortBy(col: TableGridColumn<T>) {
    if (!col.sortable || this.resizingActive) return;

    if (this.sortColumn === col.field) {
      if (this.sortDir === 'asc') {
        this.sortDir = 'desc';
      } else if (this.sortDir === 'desc') {
        this.sortColumn = null;
        this.sortDir = null;
      } else {
        this.sortDir = 'asc';
      }
    } else {
      this.sortColumn = col.field as string;
      this.sortDir = 'asc';
    }

    this.page = 1;
    this.updatePagedData();
  }


  /* ---------------------------- Pagination ----------------------------------- */

  updatePagedData() {
    const rows = [...this.data];
    if (this.sortColumn) {
      rows.sort((a, b) => {
        const av = a[this.sortColumn! as keyof T];
        const bv = b[this.sortColumn! as keyof T];
        if (av == null) return 1;
        if (bv == null) return -1;
        return this.sortDir === 'asc'
          ? (av > bv ? 1 : -1)
          : (av < bv ? 1 : -1);
      });
    }

    this.total = rows.length;
    this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
    this.pageData = rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.updatePagedData();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePagedData();
    }
  }


  /* ---------------------------- Column Resizing ----------------------------------- */

  updateResizerHandles() {
    if (!this.scrollRef || !this.headerCells?.length) return;

    const containerLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;

    this.resizerHandles = this.headerCells.map((cellRef, idx) => {
      const rect = cellRef.nativeElement.getBoundingClientRect();
      return { idx, x: rect.right - containerLeft + scroll };
    }).filter(h => h.idx < this.config.columns.length - 1 || this.config.actions?.length);
  }

  startResize(ev: MouseEvent, idx: number) {
    // Prevent default behavior and stop event from propagating (to avoid unwanted selection or bubbling)
    ev.preventDefault();
    ev.stopPropagation();

    // Begin resizing state
    this.resizingActive = true;
    this.leftColIdx = idx;
    this.startX = ev.clientX;

    // Get the left column DOM element and its dimensions
    const leftCell = this.headerCells.toArray()[idx].nativeElement;
    const leftRect = leftCell.getBoundingClientRect();

    // Determine if this is the last data column (before the actions column)
    const isLastDataCol = idx === this.config.columns.length - 1 && this.config.actions?.length;

    // Get the right column DOM element and its dimensions (or null if it's the actions column)
    const rightCell = isLastDataCol
      ? null
      : this.headerCells.toArray()[idx + 1].nativeElement;
    const rightRect = rightCell ? rightCell.getBoundingClientRect() : null;

    // Save initial widths before resizing starts
    this.leftStartW = leftRect.width;
    this.rightStartW = isLastDataCol ? this.actionsWidth : rightRect!.width;

    // Set minimum width constraint for the right column
    this.rightMinW = isLastDataCol ? 48 : rightRect!.width;

    // Calculate starting offset for the vertical guide line
    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;
    this.startLineOffset = ev.clientX - contLeft + scroll;

    // Initialize guide line position
    this.resizeLinePx = this.startLineOffset;

    // Set global cursor to indicate resizing in progress
    document.body.style.cursor = 'col-resize';
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(ev: MouseEvent) {
    if (!this.resizingActive) return; // Do nothing if not actively resizing

    const defaultMinWidth = 64;

    // Get left and right column definitions
    const leftCol = this.config.columns[this.leftColIdx];
    const rightCol = this.config.columns[this.leftColIdx + 1];

    // Resolve min/max widths for left column
    const leftMin = parseFloat(leftCol.minWidth ?? `${defaultMinWidth}`);
    const leftMax = parseFloat(leftCol.maxWidth ?? `${Infinity}`);

    // Resolve min/max widths for right column
    const rightMin = this.leftColIdx < this.config.columns.length - 1
      ? parseFloat(rightCol?.minWidth ?? `${defaultMinWidth}`)
      : defaultMinWidth;

    const rightMax = this.leftColIdx < this.config.columns.length - 1
      ? parseFloat(rightCol?.maxWidth ?? `${Infinity}`)
      : Infinity;

    // Get mouse X position
    const mouseX = ev.clientX;

    // Get left cell DOM element and its current bounds
    const leftCell = this.headerCells.toArray()[this.leftColIdx].nativeElement;
    const leftRect = leftCell.getBoundingClientRect();

    // Determine if the right column is the actions column (last column)
    const isLastDataCol = this.leftColIdx === this.config.columns.length - 1 && this.config.actions?.length;

    // Get right cell bounds (either regular column or actions column)
    const rightRect = isLastDataCol
      ? this.actionsHeaderCell?.nativeElement.getBoundingClientRect() ?? null
      : this.headerCells.toArray()[this.leftColIdx + 1].nativeElement.getBoundingClientRect();

    if (!rightRect) return;

    // Calculate tentative new widths based on mouse position
    let newLeftW = mouseX - leftRect.left;
    let newRightW = rightRect.right - mouseX;

    // --- Clamp widths to min values ---
    if (newLeftW < leftMin) {
      const offset = leftMin - newLeftW;
      newLeftW = leftMin;
      newRightW = Math.max(rightMin, newRightW - offset);
    } else if (newRightW < rightMin) {
      const offset = rightMin - newRightW;
      newRightW = rightMin;
      newLeftW = Math.max(leftMin, newLeftW - offset);
    }

    // --- Clamp left width to max, and expand right accordingly ---
    if (newLeftW > leftMax) {
      const offset = newLeftW - leftMax;
      newLeftW = leftMax;
      newRightW = Math.max(rightMin, newRightW + offset);
    }

    // --- Clamp right width to max, and expand left accordingly ---
    if (this.leftColIdx < this.config.columns.length - 1) {
      if (newRightW > rightMax) {
        const offset = newRightW - rightMax;
        newRightW = rightMax;
        newLeftW = Math.max(leftMin, newLeftW + offset);
      }

      // Apply new widths to both columns
      this.config.columns[this.leftColIdx].width = `${newLeftW}px`;
      this.config.columns[this.leftColIdx + 1].width = `${newRightW}px`;
    } else {
      // If resizing the last data column against the actions column
      this.config.columns[this.leftColIdx].width = `${newLeftW}px`;
      this.actionsWidth = newRightW;
    }

    // Update visual resize guide line
    const containerLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;
    this.resizeLinePx = mouseX - containerLeft + scroll;

    // Recalculate handle positions
    this.updateResizerHandles();
  }

  @HostListener('document:mouseup')
  stopResize() {
    if (this.resizingActive) {
      this.resizingActive = false;
      document.body.style.cursor = '';
    }
  }
}
