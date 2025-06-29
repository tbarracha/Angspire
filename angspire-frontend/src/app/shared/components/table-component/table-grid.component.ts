import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGridConfig, TableGridColumn } from './table-interfaaces';

@Component({
  selector: 'app-table-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="w-full h-full flex flex-col rounded shadow min-w-[720px] overflow-hidden bg-card text-card-contrast relative">
    <!-- ───── Scroll Container ───── -->
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
                    'hover:bg-primary hover:text-secondary-contrast': col.sortable,
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

          <!-- ───── Handles Overlay ───── -->
          <div class="absolute top-0 left-0 h-full w-full z-30 pointer-events-none"
               *ngIf="resizerHandles.length">
            <div *ngFor="let h of resizerHandles"
                 class="absolute top-0 h-full w-2 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-accent/40 pointer-events-auto"
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
  `
})
export class TableGridComponent<T extends Record<string, any>> implements OnChanges, AfterViewInit {
  /* ──────────────────────────── Inputs / Outputs ──────────────────────────── */
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();

  /* ──────────────────────────── Template refs ─────────────────────────────── */
  @ViewChild('scrollRef', { static: false }) scrollRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('headerCell') headerCells!: QueryList<ElementRef<HTMLTableCellElement>>;
  @ViewChild('actionsHeader', { static: false }) actionsHeaderCell!: ElementRef<HTMLTableCellElement>;

  /* ──────────────────────────── State & misc (same as before) ─────────────── */
  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;
  totalPages = 1;
  pageData: T[] = [];

  /* resize */
  resizerHandles: { idx: number; x: number }[] = [];
  resizingActive = false;
  leftColIdx = -1;
  startX = 0;
  leftStartW = 0;
  rightStartW = 0;
  resizeLinePx = 0;
  actionsWidth = 120;
  rightMinW = 48;
  startLineOffset = 0;


  /* ──────────────────────────── Lifecycle ─────────────────────────────────── */
  ngOnChanges() {
    this.ensureWidths();
    this.updatePagedData();
    this.updateResizerHandles();
  }

  ngAfterViewInit() {
    // initial after view render
    requestAnimationFrame(() => this.updateResizerHandles());
  }

  onRefresh() {
    this.refresh.emit();
  }

  ensureWidths() {
    if (!this.config?.columns) return;
    this.config.columns.forEach((c: TableGridColumn<T>) => {
      if (!c.width) c.width = '160px';
    });
  }

  sortBy(col: TableGridColumn<T>) {
    if (!col.sortable || this.resizingActive)
      return;

    if (this.sortColumn === col.field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col.field as string;
      this.sortDir = 'asc';
    }
    this.page = 1;
    this.updatePagedData();
  }

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

  updateResizerHandles() {
    if (!this.scrollRef || !this.headerCells?.length) return;

    const containerLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;

    this.resizerHandles = this.headerCells.map((cellRef, idx) => {
      const rect = cellRef.nativeElement.getBoundingClientRect();
      return { idx, x: rect.right - containerLeft + scroll };
    })
      // skip final data-data handle if no actions column
      .filter(h => h.idx < this.config.columns.length - 1 || this.config.actions?.length);
  }

  startResize(ev: MouseEvent, idx: number) {
    ev.preventDefault();
    ev.stopPropagation();

    this.resizingActive = true;
    this.leftColIdx = idx;
    this.startX = ev.clientX;

    // === read live DOM widths instead of inline style =========
    const leftCell = this.headerCells.toArray()[idx].nativeElement;
    const leftRect = leftCell.getBoundingClientRect();
    const isLastDataCol = idx === this.config.columns.length - 1 && this.config.actions?.length;
    const rightCell = isLastDataCol
      ? null
      : this.headerCells.toArray()[idx + 1].nativeElement;
    const rightRect = rightCell ? rightCell.getBoundingClientRect() : null;

    this.leftStartW = leftRect.width;
    this.rightStartW = isLastDataCol ? this.actionsWidth : rightRect!.width;
    this.rightMinW = isLastDataCol ? 48 : rightRect!.width;   // real min width

    // guide line
    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;
    //this.startLineOffset = leftRect.right - contLeft + scroll;   // exact edge
    this.startLineOffset = ev.clientX - contLeft + scroll;
    this.resizeLinePx = this.startLineOffset;

    document.body.style.cursor = 'col-resize';
  }

  @HostListener('document:mousemove', ['$event'])
onMove(ev: MouseEvent) {
  if (!this.resizingActive) return;

  const minWidth = 48;
  const mouseX = ev.clientX;

  const leftCell = this.headerCells.toArray()[this.leftColIdx].nativeElement;
  const leftRect = leftCell.getBoundingClientRect();
  const isLastDataCol = this.leftColIdx === this.config.columns.length - 1 && this.config.actions?.length;

  let rightRect: DOMRect | null = null;
  if (isLastDataCol) {
    rightRect = this.actionsHeaderCell?.nativeElement.getBoundingClientRect() ?? null;
  } else {
    rightRect = this.headerCells.toArray()[this.leftColIdx + 1].nativeElement.getBoundingClientRect();
  }

  if (!rightRect) return;

  // Compute new widths based on keeping the mouseX as the column boundary
  let newLeftW = mouseX - leftRect.left;
  let newRightW = rightRect.right - mouseX;

  // Enforce minimums
  if (newLeftW < minWidth) {
    const offset = minWidth - newLeftW;
    newLeftW = minWidth;
    newRightW = Math.max(minWidth, newRightW - offset);
  } else if (newRightW < minWidth) {
    const offset = minWidth - newRightW;
    newRightW = minWidth;
    newLeftW = Math.max(minWidth, newLeftW - offset);
  }

  // Apply column widths
  if (this.leftColIdx < this.config.columns.length - 1) {
    this.config.columns[this.leftColIdx].width = `${newLeftW}px`;
    this.config.columns[this.leftColIdx + 1].width = `${newRightW}px`;
  } else {
    this.config.columns[this.leftColIdx].width = `${newLeftW}px`;
    this.actionsWidth = newRightW;
  }

  // Move the guide line exactly under the mouse
  const containerLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
  const scroll = this.scrollRef.nativeElement.scrollLeft;
  this.resizeLinePx = mouseX - containerLeft + scroll;

  this.updateResizerHandles();
}


  @HostListener('document:mouseup')
  stopResize() {
    if (this.resizingActive) {
      this.resizingActive = false;
      document.body.style.cursor = '';
    }
  }

  trackByField(_: number, col: TableGridColumn<T>) { return col.field; }
}
