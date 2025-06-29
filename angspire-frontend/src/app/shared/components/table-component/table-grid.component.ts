import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="w-full h-full flex flex-col rounded shadow min-w-[720px]
            overflow-hidden bg-card text-card-contrast relative">

  <!-- SCROLL + RESIZE HANDLES -->
  <div #scrollRef class="flex-1 min-h-0 overflow-x-auto" (scroll)="updateResizerHandles()">
    <div *ngIf="resizingActive"
         class="pointer-events-none absolute top-0 h-full w-0.5 bg-accent opacity-80 z-50"
         [style.left.px]="resizeLinePx"></div>

    <table class="w-full min-w-max table-fixed">
      <thead *ngIf="config.showHeader ?? true"
             class="sticky top-0 z-10 bg-highlight border-b border-border">
        <tr>
          <ng-container *ngFor="let col of config.columns; let i = index; trackBy: trackByField">
            <th #headerCell
                [style.width]="col.width"
                [ngClass]="{
                  'cursor-pointer': col.sortable,
                  'hover:bg-primary hover:text-primary-contrast': col.sortable && !resizingActive,
                  'border-r border-primary/50': config.showVerticalLines
                }"
                class="py-2 px-4 font-semibold text-sm text-left bg-secondary/50 text-highlight-contrast select-none relative z-50"
                (mousedown)="col.sortable && onSort(col.field)">
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
              [style.width.px]="actionsWidth"
              class="py-2 px-4 font-semibold text-right text-sm bg-secondary/50 text-highlight-contrast border-0">
            {{ config.actions.label }}
          </th>
        </tr>
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
            <td [style.width]="col.width"
                [ngClass]="{
                  'border-r border-border': config.showVerticalLines,
                  'border-b border-border': config.showHorizontalLines
                }"
                class="py-1 px-4 truncate text-sm border-0">
              {{ row[col.field] ?? '—' }}
            </td>
          </ng-container>
          <td *ngIf="config.actions"
              [style.width.px]="actionsWidth"
              [ngClass]="{
                'border-r border-border': config.showVerticalLines,
                'border-b border-border': config.showHorizontalLines
              }"
              class="py-1 px-4 text-right space-x-1 border-0">
            <ng-container *ngFor="let act of config.actions.actions">
              <button type="button"
                      (click)="act.callback(row)"
                      [ngClass]="act.colorClass || 'bg-primary text-primary-contrast hover:bg-secondary hover:text-secondary-contrast'"
                      class="px-2 py-1 rounded font-semibold text-sm transition">
                {{ act.label }}
              </button>
            </ng-container>
          </td>
        </tr>
      </tbody>

        <div *ngIf="resizerHandles.length"
             class="absolute top-0 left-0 h-full w-full z-30 pointer-events-none">
          <div *ngFor="let h of resizerHandles"
               class="absolute top-0 h-full w-2 -translate-x-1/2 cursor-col-resize bg-transparent pointer-events-auto"
               [style.left.px]="h.x"
               (mousedown)="startResize($event, h.idx)"
               (click)="$event.stopPropagation()">
          </div>
        </div>
    </table>
  </div>

  <!-- FOOTER -->
  <ng-container *ngIf="config.showFooter ?? true">
    <div class="sticky bottom-0 z-50 bg-card border-t border-border">
      <div class="flex items-center justify-between py-1 px-3 text-xs h-9">
        <span class="text-secondary text-xs">
          Page {{ page }} of {{ totalPages }} ({{ total }} items)
        </span>
        <div class="flex items-center gap-2">
          <select *ngIf="pageSizeOptions.length > 1"
                  [(ngModel)]="pageSize"
                  (change)="onPageSizeChange()"
                  class="h-8 px-2 py-1 rounded border border-input-border text-xs bg-input-background text-input-text">
            <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }}/page</option>
          </select>

          <button (click)="onRefresh()"
                  title="Refresh"
                  class="h-8 px-2 py-1 rounded bg-secondary text-secondary-contrast hover:bg-secondary/80">
            ⟳
          </button>
          <button (click)="prevPage()" [disabled]="page<=1"
                  class="h-8 px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80">
            ←
          </button>
          <button (click)="nextPage()" [disabled]="page>=totalPages"
                  class="h-8 px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80">
            →
          </button>
        </div>
      </div>
    </div>
  </ng-container>
</div>
  `
})
export class TableGridComponent<T extends Record<string, any>>
  implements OnChanges, AfterViewInit
{
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0;
  @Input() loading = false;

  @Output() refresh     = new EventEmitter<void>();
  @Output() pageRequest = new EventEmitter<{
    page: number;
    pageSize: number;
    sortColumn: string | null;
    sortDir: 'asc' | 'desc' | null;
  }>();

  @ViewChild('scrollRef',   { static: false }) scrollRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('headerCell') headerCells!: QueryList<ElementRef<HTMLTableCellElement>>;
  @ViewChild('actionsHeader',{ static: false }) actionsHeaderCell!: ElementRef<HTMLTableCellElement>;

  sortColumn: string | null = null;
  sortDir:    'asc' | 'desc' | null = null;

  totalPages = 1;
  pageSizeOptions: number[] = [10, 20, 50, 100];
  pageData: T[] = [];

  // resizing state
  resizerHandles: { idx: number; x: number }[] = [];
  resizingActive = false;
  leftColIdx = -1;
  resizeLinePx = 0;
  startX = 0;
  leftStartW = 0;
  rightStartW = 0;
  rightMinW = 48;
  startLineOffset = 0;
  actionsWidth = 120;

  ngOnChanges(): void {
    // restore widths
    if (this.config.storageKey) this.loadStoredWidths();

    // page-size options
    if (this.config.pageSizeOptions?.length) {
      this.pageSizeOptions = this.config.pageSizeOptions;
    }

    // actions column width
    if (this.config.actions?.width) {
      const w = parseFloat(this.config.actions.width);
      if (!isNaN(w)) this.actionsWidth = w;
    }

    // compute total pages
    this.totalPages = Math.ceil(this.total / this.pageSize) || 1;

    // update display
    this.updateDisplay();
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

  private updateDisplay() {
    let items = [...this.data];
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
    this.pageData = items;
    this.updateResizerHandles();
  }

  onRefresh() {
    this.refresh.emit();
  }

  onSort(field: string|keyof T) {
    if (this.resizingActive) return;
    if (this.sortColumn === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc'
                   : this.sortDir === 'desc' ? null
                   : 'asc';
      if (!this.sortDir) this.sortColumn = null;
    } else {
      this.sortColumn = field as string;
      this.sortDir = 'asc';
    }
    this.page = 1;
    this.updateDisplay();
    this.emitPageRequest();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.emitPageRequest();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.emitPageRequest();
    }
  }

  onPageSizeChange() {
    this.page = 1;
    this.emitPageRequest();
  }

  private emitPageRequest() {
    this.pageRequest.emit({
      page:       this.page,
      pageSize:   this.pageSize,
      sortColumn: this.sortColumn,
      sortDir:    this.sortDir
    });
  }

  // ——— Resizing logic unchanged from your original component ———

  private ensureWidths() {
    this.config.columns.forEach(c => {
      if (!c.width) c.width = '160px';
    });
  }

  private setInitialColumnWidths(): void {
    if (!this.headerCells?.length) return;
    this.headerCells.forEach((cellRef, idx) => {
      if (!this.config.columns[idx].width) {
        const w = cellRef.nativeElement.getBoundingClientRect().width;
        this.config.columns[idx].width = `${w}px`;
      }
    });
    if (this.actionsHeaderCell && this.config.actions && !this.config.actions.width) {
      this.actionsWidth = this.actionsHeaderCell.nativeElement
                          .getBoundingClientRect().width;
    }
  }

  private loadStoredWidths() {
    try {
      const raw = localStorage.getItem(this.config.storageKey!);
      if (!raw) return;
      const widths: string[] = JSON.parse(raw);
      if (widths.length === this.config.columns.length) {
        this.config.columns.forEach((c, i) => c.width = widths[i] || c.width);
        this.updateResizerHandles();
      }
    } catch { /* ignore */ }
  }

  private saveStoredWidths() {
    const widths = this.config.columns.map(c => c.width || '');
    try {
      localStorage.setItem(this.config.storageKey!, JSON.stringify(widths));
    } catch { /* ignore */ }
  }

  updateResizerHandles() {
    if (!this.scrollRef || !this.headerCells) return;
    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll  = this.scrollRef.nativeElement.scrollLeft;
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
    const isLast   = idx === this.config.columns.length - 1 && !!this.config.actions;
    const rightRect= isLast
      ? null
      : this.headerCells.toArray()[idx + 1].nativeElement.getBoundingClientRect();

    this.leftStartW  = leftRect.width;
    this.rightStartW = isLast ? this.actionsWidth : rightRect!.width;
    this.rightMinW   = isLast ? 48 : rightRect!.width;

    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll   = this.scrollRef.nativeElement.scrollLeft;
    this.startLineOffset = ev.clientX - contLeft + scroll;
    this.resizeLinePx    = this.startLineOffset;
    document.body.style.cursor = 'col-resize';
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(ev: MouseEvent) {
    if (!this.resizingActive) return;
    const defaultMin = 64;
    const leftCol  = this.config.columns[this.leftColIdx];
    const rightCol = this.config.columns[this.leftColIdx + 1];
    const leftMin  = parseFloat(leftCol.minWidth ?? `${defaultMin}`);
    const leftMax  = parseFloat(leftCol.maxWidth ?? `${Infinity}`);
    const isLast   = this.leftColIdx === this.config.columns.length - 1 && !!this.config.actions;
    const rightMin = isLast
      ? defaultMin
      : parseFloat(rightCol?.minWidth ?? `${defaultMin}`);
    const rightMax = isLast
      ? Infinity
      : parseFloat(rightCol?.maxWidth ?? `${Infinity}`);

    const mouseX = ev.clientX;
    const leftRect = this.headerCells.toArray()[this.leftColIdx].nativeElement.getBoundingClientRect();
    const rightRect= isLast
      ? this.actionsHeaderCell.nativeElement.getBoundingClientRect()
      : this.headerCells.toArray()[this.leftColIdx + 1].nativeElement.getBoundingClientRect();

    let newLeft  = mouseX - leftRect.left;
    let newRight = rightRect.right - mouseX;

    // clamp logic
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
      newLeft  = leftMax;
      newRight = Math.max(rightMin, newRight + diff);
    }
    if (!isLast && newRight > rightMax) {
      const diff = newRight - rightMax;
      newRight = rightMax;
      newLeft  = Math.max(leftMin, newLeft + diff);
    }

    this.config.columns[this.leftColIdx].width = `${newLeft}px`;
    if (isLast) {
      this.actionsWidth = newRight;
    } else {
      this.config.columns[this.leftColIdx + 1].width = `${newRight}px`;
    }

    const contLeft = this.scrollRef.nativeElement.getBoundingClientRect().left;
    const scroll   = this.scrollRef.nativeElement.scrollLeft;
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
