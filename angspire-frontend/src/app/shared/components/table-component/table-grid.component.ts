import { Component, ElementRef, HostListener, Input, OnChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGridConfig, TableGridColumn } from './table-interfaaces';

@Component({
  selector: 'app-table-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="w-full h-full flex flex-col rounded shadow min-w-[720px] overflow-hidden bg-card text-card-contrast relative">
    <div class="flex-1 min-h-0 overflow-x-auto relative" #scrollRef>
      <!-- Vertical resize line overlay -->
      <div
        *ngIf="resizingActive"
        [style.left.px]="getResizeLineLeft()"
        class="pointer-events-none absolute top-0 z-50 h-full w-0.5 bg-accent opacity-80 transition-all"
        style="will-change: left;"
      ></div>
      <table #tableRef class="w-full min-w-max table-fixed">
        @if (config.showHeader ?? true) {
          <thead class="sticky top-0 z-10 bg-highlight border-b border-border">
            <tr>
              @for (col of config.columns; track col.field) {
                <th
                  class="py-2 px-4 font-semibold text-sm text-left bg-highlight text-highlight-contrast border-0 relative group select-none"
                  [style.width]="col.width"
                  [ngClass]="{'cursor-pointer': col.sortable, 'hover:bg-primary hover:text-secondary-contrast': col.sortable}"
                  (click)="col.sortable && sortBy(col)"
                >
                  <div class="flex items-center w-full">
                    <span class="truncate whitespace-nowrap overflow-hidden block">{{ col.label }}</span>
                    @if (col.sortable) {
                      <span class="ml-1">
                        @if (sortColumn === col.field) {
                          <span *ngIf="sortDir === 'asc'">&#8593;</span>
                          <span *ngIf="sortDir === 'desc'">&#8595;</span>
                        }
                      </span>
                    }
                  </div>
                  <!-- Resize handle -->
                  <span
                    class="absolute right-0 top-0 h-full w-2 cursor-col-resize z-20 group-hover:bg-muted/40"
                    (mousedown)="startResize($event, col)"
                    (click)="$event.stopPropagation()"
                  ></span>
                </th>
              }
              @if (config.actions?.length) {
                <th class="py-2 px-4 font-semibold text-right text-sm bg-highlight text-highlight-contrast relative group select-none"
                    [style.width]="actionsWidth + 'px'">
                  Actions
                  <span
                    class="absolute right-0 top-0 h-full w-2 cursor-col-resize z-20 group-hover:bg-muted/40"
                    (mousedown)="startResize($event, null)"
                    (click)="$event.stopPropagation()"
                  ></span>
                </th>
              }
            </tr>
          </thead>
        }
        <tbody>
          <tr *ngIf="loading">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted bg-card">Loading...</td>
          </tr>
          <tr *ngIf="!loading && pageData.length === 0">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted bg-card">No data found.</td>
          </tr>
          <tr *ngFor="let row of pageData" class="hover:bg-hover transition">
            @for (col of config.columns; track col.field) {
              <td
                class="py-1 px-4 truncate whitespace-nowrap overflow-hidden text-sm border-0"
                [style.width]="col.width"
              >
                {{ row[col.field] ?? '—' }}
              </td>
            }
            @if (config.actions?.length) {
              <td class="py-1 px-4 text-right space-x-1 border-0" [style.width]="actionsWidth + 'px'">
                <ng-container *ngFor="let act of config.actions">
                  <button
                    type="button"
                    class="px-2 py-1 rounded font-semibold text-sm transition"
                    [ngClass]="act.colorClass || 'bg-primary text-primary-contrast hover:bg-secondary hover:text-secondary-contrast'"
                    (click)="act.callback(row)"
                  >
                    {{ act.label }}
                  </button>
                </ng-container>
              </td>
            }
          </tr>
        </tbody>
      </table>
    </div>
    @if (config.showFooter ?? true) {
      <div class="sticky bottom-0 z-10 bg-card border-t border-border">
        <div class="flex items-center justify-between py-2 px-4">
          <div class="text-muted text-xs">
            Page {{ page }} of {{ totalPages }} ({{ total }} items)
          </div>
          <div class="flex items-center gap-2">
            <select *ngIf="pageSizeOptions.length > 1"
                    [(ngModel)]="pageSize"
                    (change)="updatePagedData()"
                    class="rounded border border-input-border px-2 py-1 text-xs bg-input-background text-input-text">
              <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}/page</option>
            </select>
            <button class="px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 transition"
                    [disabled]="page <= 1" (click)="prevPage()">&larr;</button>
            <button class="px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 transition"
                    [disabled]="page >= totalPages" (click)="nextPage()">&rarr;</button>
          </div>
        </div>
      </div>
    }
  </div>
  `
})
export class TableGridComponent<T extends Record<string, any>> implements OnChanges {
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() loading = false;

  @ViewChild('tableRef', { static: false }) tableRef!: ElementRef<HTMLTableElement>;
  @ViewChild('scrollRef', { static: false }) scrollRef!: ElementRef<HTMLDivElement>;

  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  page = 1;
  pageSize = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  pageData: T[] = [];
  total = 0;
  totalPages = 1;

  // Resizing state
  resizingCol: TableGridColumn<T> | null = null;
  resizingStartX = 0;
  resizingStartWidth = 0;
  resizingActions = false;
  actionsWidth = 120;
  resizingActive = false;
  resizeLineOffset = 0;
  resizingColIndex = -1;
  resizingNextCol: TableGridColumn<T> | null = null;
  resizingNextStartWidth = 0;

  ngOnChanges() {
    if (this.config?.pageSizeOptions) {
      this.pageSizeOptions = this.config.pageSizeOptions;
    }
    // Set default widths if not present
    this.config.columns.forEach((col) => {
      if (!col.width) col.width = '160px';
    });
    this.page = 1;
    this.updatePagedData();
  }

  sortBy(col: TableGridColumn<T>) {
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
    let rows = [...this.data];
    if (this.sortColumn) {
      rows.sort((a, b) => {
        const aValue = a[this.sortColumn! as keyof T];
        const bValue = b[this.sortColumn! as keyof T];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (aValue === bValue) return 0;
        return this.sortDir === 'asc'
          ? aValue > bValue ? 1 : -1
          : aValue < bValue ? 1 : -1;
      });
    }
    this.total = rows.length;
    this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
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

  // --- Column resizing logic ---
  startResize(event: MouseEvent, col: TableGridColumn<T> | null) {
    event.preventDefault();
    event.stopPropagation();
    this.resizingCol = col;
    this.resizingActions = col === null;
    this.resizingActive = true;
    this.resizingStartX = event.clientX;

    if (col) {
      this.resizingStartWidth = parseInt(col.width?.replace('px', '') || '160', 10);
      this.resizingColIndex = this.config.columns.findIndex(c => c === col);
      if (this.resizingColIndex >= 0 && this.resizingColIndex < this.config.columns.length - 1) {
        this.resizingNextCol = this.config.columns[this.resizingColIndex + 1];
        this.resizingNextStartWidth = parseInt(this.resizingNextCol.width?.replace('px', '') || '160', 10);
      } else {
        this.resizingNextCol = null;
        this.resizingNextStartWidth = 0;
      }
    } else {
      this.resizingStartWidth = this.actionsWidth;
    }
    document.body.style.cursor = 'col-resize';
  }

  getResizeLineLeft(): number {
    if (!this.resizingActive) return 0;
    let left = 0;
    if (this.resizingCol) {
      const colIdx = this.config.columns.findIndex(c => c === this.resizingCol);
      for (let i = 0; i <= colIdx; i++) {
        left += parseInt(this.config.columns[i].width?.replace('px', '') || '160', 10);
      }
    } else if (this.resizingActions) {
      for (let i = 0; i < this.config.columns.length; i++) {
        left += parseInt(this.config.columns[i].width?.replace('px', '') || '160', 10);
      }
      left += this.actionsWidth;
    }
    try {
      if (this.scrollRef && this.scrollRef.nativeElement) {
        left -= this.scrollRef.nativeElement.scrollLeft;
      }
    } catch {}
    return left;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.resizingActive) return;
    const dx = event.clientX - this.resizingStartX;

    if (this.resizingCol) {
      const minWidth = 48;
      let newWidth = Math.max(minWidth, this.resizingStartWidth + dx);
      let delta = newWidth - this.resizingStartWidth;
      if (this.resizingNextCol) {
        let nextNewWidth = Math.max(minWidth, this.resizingNextStartWidth - delta);
        if (nextNewWidth === minWidth) {
          newWidth = this.resizingStartWidth + (this.resizingNextStartWidth - minWidth);
        }
        this.resizingNextCol.width = `${nextNewWidth}px`;
      }
      this.resizingCol.width = `${newWidth}px`;
    }
    if (this.resizingActions) {
      this.actionsWidth = Math.max(48, this.resizingStartWidth + dx);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.resizingActive) {
      this.resizingCol = null;
      this.resizingColIndex = -1;
      this.resizingNextCol = null;
      this.resizingActive = false;
      document.body.style.cursor = '';
    }
  }
}
