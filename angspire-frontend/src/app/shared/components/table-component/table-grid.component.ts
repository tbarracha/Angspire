import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { Observable } from 'rxjs';

export interface TableGridColumnBase {
  label: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  customClass?: string;
}

export interface TableGridColumn<T = any> extends TableGridColumnBase {
  field: keyof T | string;
  sortable?: boolean;
}

export interface TableGridAction extends TableGridColumnBase {
  actions: {
    label: string;
    icon?: string;
    callback: (row: any) => void;
    colorClass?: string;
  }[];
}

export interface TableGridConfig<T = any> {
  columns: TableGridColumn<T>[];
  actions?: TableGridAction;
  pageSizeOptions?: number[];

  fetchAll?: () => Observable<T[]>;

  fetchPage?: (params: {
    page: number;
    pageSize: number;
    sortColumn: string | null;
    sortDir: 'asc' | 'desc' | null;
  }) => Observable<PaginatedResult<T>>;

  onRefresh?: () => void;

  storageKey?: string;

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
  <!-- Scroll Container -->
  <div #scrollRef
       class="flex-1 min-h-0 overflow-x-auto relative"
       (scroll)="updateResizerHandles()">

    <!-- guide line while dragging -->
    <div *ngIf="resizingActive"
         class="pointer-events-none absolute top-0 h-full w-0.5 bg-accent opacity-80 z-50"
         [style.left.px]="resizeLinePx"></div>

    <!-- Table -->
    <table class="w-full min-w-max table-fixed">
      <thead *ngIf="config.showHeader ?? true"
             class="sticky top-0 z-10 bg-highlight border-b border-border">
        <tr>
          <ng-container *ngFor="let col of config.columns; let idx = index; trackBy: trackByField">
            <th #headerCell
                class="py-2 px-4 font-semibold text-sm text-left bg-secondary/50 text-highlight-contrast border-0 relative select-none group"
                [style.width]="col.width"
                [ngClass]="{
                  'cursor-pointer': col.sortable,
                  'hover:bg-primary hover:text-secondary-contrast': col.sortable && !resizingActive,
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

          <th *ngIf="config.actions"
              #actionsHeader
              class="py-2 px-4 font-semibold text-right text-sm bg-secondary/50 text-highlight-contrast border-0"
              [style.width.px]="actionsWidth">
            {{ config.actions.label }}
          </th>
        </tr>

        <!-- handles overlay -->
        <div *ngIf="resizerHandles.length"
             class="absolute top-0 left-0 h-full w-full z-30 pointer-events-none">
          <div *ngFor="let h of resizerHandles"
               class="absolute top-0 h-full w-2 -translate-x-1/2 cursor-col-resize bg-transparent pointer-events-auto"
               [style.left.px]="h.x"
               (mousedown)="startResize($event, h.idx)"
               (click)="$event.stopPropagation()">
          </div>
        </div>
      </thead>

      <tbody>
        <tr *ngIf="loading">
          <td [attr.colspan]="config.columns.length + (config.actions ? 1 : 0)"
              class="py-8 text-center text-muted bg-card">Loading…</td>
        </tr>
        <tr *ngIf="!loading && pageData.length === 0">
          <td [attr.colspan]="config.columns.length + (config.actions ? 1 : 0)"
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
          <td *ngIf="config.actions"
              class="py-1 px-4 text-right space-x-1 border-0"
              [style.width.px]="actionsWidth">
            <ng-container *ngFor="let act of config.actions.actions">
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

  <!-- Footer -->
  <ng-container *ngIf="config.showFooter ?? true">
    <div class="sticky bottom-0 z-10 bg-card border-t border-border">
      <div class="flex items-center justify-between py-2 px-4">
        <span class="text-secondary text-xs">
          Page {{ page }} of {{ totalPages }} ({{ total }} items)
        </span>
        <div class="flex items-center gap-2">
          <!-- Page Size Dropdown -->
          <select *ngIf="pageSizeOptions.length > 1"
                  [(ngModel)]="pageSize"
                  (change)="onPageSizeChanged()"
                  class="h-8 px-2 py-1 rounded border border-input-border text-xs bg-input-background text-input-text focus:outline-none">
            <option *ngFor="let size of pageSizeOptions" [value]="size">
              {{ size }}/page
            </option>
          </select>

          <!-- Refresh Button -->
          <button type="button"
                  title="Refresh"
                  (click)="onRefresh()"
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
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() loading = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() pageRequest = new EventEmitter<{ page: number; pageSize: number }>();

  @ViewChild('scrollRef', { static: false }) scrollRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('headerCell') headerCells!: QueryList<ElementRef<HTMLTableCellElement>>;
  @ViewChild('actionsHeader', { static: false }) actionsHeaderCell!: ElementRef<HTMLTableCellElement>;

  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' | null = null;

  page = 1;
  pageSize = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];
  total = 0;
  totalPages = 1;
  pageData: T[] = [];

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

  ngOnChanges(): void {
    // 1) Restore any saved widths
    if (this.config.storageKey) {
      this.loadStoredWidths();
    }

    // 2) Apply pageSizeOptions if provided
    if (this.config.pageSizeOptions?.length) {
      this.pageSizeOptions = this.config.pageSizeOptions;
      this.pageSize = this.pageSizeOptions[0];
    }

    this.ensureWidths();

    // 3) Respect actions.width if configured
    if (this.config.actions?.width) {
      const parsed = parseFloat(this.config.actions.width);
      this.actionsWidth = isNaN(parsed) ? this.actionsWidth : parsed;
    }

    // 4) Fetch / slice data
    this.updatePagedData();
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.setInitialColumnWidths();
      this.updateResizerHandles();
    });
  }

  trackByField(_: number, col: TableGridColumn<T>) {
    return col.field;
  }

  onRefresh() {
    this.refresh.emit();
  }

  private ensureWidths() {
    this.config.columns.forEach(c => {
      if (!c.width) c.width = '160px';
    });
  }

  private setInitialColumnWidths(): void {
  if (!this.headerCells?.length) return;

  this.headerCells.forEach((cellRef, idx) => {
    if (!this.config.columns[idx].width) {          // 👈 guard
      const w = cellRef.nativeElement.getBoundingClientRect().width;
      this.config.columns[idx].width = `${w}px`;
    }
  });

  if (this.actionsHeaderCell && this.config.actions) {
    if (!this.config.actions.width) {               // 👈 guard
      this.actionsWidth =
        this.actionsHeaderCell.nativeElement.getBoundingClientRect().width;
    }
  }
}

  private loadStoredWidths() {
  if (!this.config.storageKey) return;
  try {
    const raw = localStorage.getItem(this.config.storageKey);
    if (!raw) return;

    const widths: string[] = JSON.parse(raw);
    if (widths.length === this.config.columns.length) {
      this.config.columns.forEach((c, i) => c.width = widths[i] || c.width);
      this.updateResizerHandles();      // 👈 handles match stored widths
    }
  } catch { /* ignore */ }
}

  private saveStoredWidths() {
    if (!this.config.storageKey) return;
    const widths = this.config.columns.map(c => c.width || '');
    try {
      localStorage.setItem(this.config.storageKey!, JSON.stringify(widths));
    } catch {
      // storage full / disabled, ignore
    }
  }

  sortBy(col: TableGridColumn<T>) {
    if (!col.sortable || this.resizingActive) return;
    if (this.sortColumn === col.field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : this.sortDir === 'desc' ? null : 'asc';
      if (!this.sortDir) this.sortColumn = null;
    } else {
      this.sortColumn = col.field as string;
      this.sortDir = 'asc';
    }
    this.page = 1;
    this.updatePagedData();
  }

  updatePagedData(): void {
    // Server‐driven paging takes absolute priority
    if (this.config.fetchPage) {
      this.config.fetchPage({
        page: this.page,
        pageSize: this.pageSize,
        sortColumn: this.sortColumn,
        sortDir: this.sortDir
      }).subscribe({
        next: result => {
          this.total = result.totalCount;
          this.pageData = result.items;
          this.totalPages = Math.ceil(this.total / this.pageSize);
          this.pageRequest.emit({ page: this.page, pageSize: this.pageSize });
          this.updateResizerHandles();
        },
        error: err => {
          console.error('fetchPage error', err);
        }
      });
      return;
    }

    // "Fetch all" fallback
    if (this.config.fetchAll) {
      this.config.fetchAll().subscribe({
        next: items => {
          // apply sort if requested
          if (this.sortColumn) {
            items.sort((a, b) => {
              const av = a[this.sortColumn! as keyof T];
              const bv = b[this.sortColumn! as keyof T];
              if (av == null) return 1;
              if (bv == null) return -1;
              return this.sortDir === 'asc'
                ? (av > bv ? 1 : -1)
                : (av < bv ? 1 : -1);
            });
          }
          this.total = items.length;
          this.totalPages = Math.ceil(this.total / this.pageSize);
          this.pageData = items.slice(
            (this.page - 1) * this.pageSize,
            this.page * this.pageSize
          );
          this.pageRequest.emit({ page: this.page, pageSize: this.pageSize });
          this.updateResizerHandles();
        },
        error: err => {
          console.error('fetchAll error', err);
        }
      });
      return;
    }

    // Last fallback: client‐side slice & sort of this.data
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
    this.totalPages = Math.ceil(this.total / this.pageSize);
    this.pageData = rows.slice(
      (this.page - 1) * this.pageSize,
      this.page * this.pageSize
    );

    this.pageRequest.emit({ page: this.page, pageSize: this.pageSize });
    this.updateResizerHandles();
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

  onPageSizeChanged(): void {
    this.page = 1;
    this.updatePagedData();
  }

  updateResizerHandles() {
    if (!this.scrollRef || !this.headerCells) return;
    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;

    this.resizerHandles = this.headerCells.map((cellRef, idx) => {
      const rect = cellRef.nativeElement.getBoundingClientRect();
      return { idx, x: rect.right - contLeft + scroll };
    })
      .filter(h => h.idx < this.config.columns.length - 1 || !!this.config.actions);
  }

  startResize(ev: MouseEvent, idx: number) {
    ev.preventDefault();
    ev.stopPropagation();
    this.resizingActive = true;
    this.leftColIdx = idx;
    this.startX = ev.clientX;

    const leftCell = this.headerCells.toArray()[idx].nativeElement;
    const leftRect = leftCell.getBoundingClientRect();
    const isLast = idx === this.config.columns.length - 1 && !!this.config.actions;
    const rightRect = isLast
      ? null
      : this.headerCells.toArray()[idx + 1].nativeElement.getBoundingClientRect();

    this.leftStartW = leftRect.width;
    this.rightStartW = isLast ? this.actionsWidth : rightRect!.width;
    this.rightMinW = isLast ? 48 : rightRect!.width;

    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;
    this.startLineOffset = ev.clientX - contLeft + scroll;
    this.resizeLinePx = this.startLineOffset;

    document.body.style.cursor = 'col-resize';
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(ev: MouseEvent) {
    if (!this.resizingActive) return;

    const defaultMin = 64;
    const leftCol = this.config.columns[this.leftColIdx];
    const rightCol = this.config.columns[this.leftColIdx + 1];
    const leftMin = parseFloat(leftCol.minWidth ?? `${defaultMin}`);
    const leftMax = parseFloat(leftCol.maxWidth ?? `${Infinity}`);
    const isLast = this.leftColIdx === this.config.columns.length - 1 && !!this.config.actions;
    const rightMin = isLast
      ? defaultMin
      : parseFloat(rightCol?.minWidth ?? `${defaultMin}`);
    const rightMax = isLast
      ? Infinity
      : parseFloat(rightCol?.maxWidth ?? `${Infinity}`);

    const mouseX = ev.clientX;
    const leftRect = this.headerCells.toArray()[this.leftColIdx].nativeElement.getBoundingClientRect();
    const rightRect = isLast
      ? this.actionsHeaderCell.nativeElement.getBoundingClientRect()
      : this.headerCells.toArray()[this.leftColIdx + 1].nativeElement.getBoundingClientRect();

    let newLeft = mouseX - leftRect.left;
    let newRight = rightRect.right - mouseX;

    // clamp
    if (newLeft < leftMin) {
      const diff = leftMin - newLeft;
      newLeft = leftMin;
      newRight = Math.max(rightMin, newRight - diff);
    } else if (newRight < rightMin) {
      const diff = rightMin - newRight;
      newRight = rightMin;
      newLeft = Math.max(leftMin, newLeft - diff);
    }
    if (newLeft > leftMax) {
      const diff = newLeft - leftMax;
      newLeft = leftMax;
      newRight = Math.max(rightMin, newRight + diff);
    }
    if (!isLast && newRight > rightMax) {
      const diff = newRight - rightMax;
      newRight = rightMax;
      newLeft = Math.max(leftMin, newLeft + diff);
    }

    this.config.columns[this.leftColIdx].width = `${newLeft}px`;
    if (isLast) {
      this.actionsWidth = newRight;
    } else {
      this.config.columns[this.leftColIdx + 1].width = `${newRight}px`;
    }

    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll = this.scrollRef.nativeElement.scrollLeft;
    this.resizeLinePx = mouseX - contLeft + scroll;
    this.updateResizerHandles();
  }

  @HostListener('document:mouseup')
  stopResize() {
    if (this.resizingActive) {
      this.resizingActive = false;
      document.body.style.cursor = '';
      this.saveStoredWidths();
    }
  }
}
