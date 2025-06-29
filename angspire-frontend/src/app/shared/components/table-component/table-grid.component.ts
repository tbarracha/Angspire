import { Component, ElementRef, HostListener, Input, OnChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGridColumn, TableGridConfig } from './table-interfaaces';

@Component({
  selector: 'app-table-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="w-full h-full flex flex-col rounded shadow min-w-[720px] overflow-hidden bg-card text-card-contrast relative">
    <div class="flex-1 min-h-0 overflow-x-auto relative" #scrollRef>
      <!-- vertical guide -->
      <div *ngIf="resizingActive"
           class="pointer-events-none absolute top-0 h-full w-0.5 bg-accent opacity-80 z-50"
           [style.left.px]="resizeLinePx"></div>

      <table class="w-full min-w-max table-fixed">
        <!-- HEADER -->
        <ng-container *ngIf="config?.showHeader ?? true">
          <thead class="sticky top-0 z-10 bg-highlight border-b border-border">
            <tr>
              <ng-container *ngFor="let col of config.columns; let idx = index; trackBy: trackByField">
                <th class="py-2 px-4 font-semibold text-sm text-left bg-highlight text-highlight-contrast border-0 relative select-none group"
                    [style.width]="col.width"
                    [ngClass]="{'cursor-pointer': col.sortable, 'hover:bg-primary hover:text-secondary-contrast': col.sortable}"
                    (click)="col.sortable && sortBy(col)">
                  <div class="flex items-center">
                    <span class="truncate">{{ col.label }}</span>
                    <span *ngIf="col.sortable" class="ml-1">
                      <span *ngIf="sortColumn === col.field">
                        <span *ngIf="sortDir==='asc'">&#8593;</span>
                        <span *ngIf="sortDir==='desc'">&#8595;</span>
                      </span>
                    </span>
                  </div>

                  <!-- resizer between columns, hidden until hover -->
                  <span *ngIf="idx < config.columns.length - 1"
                        class="absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 group-hover:opacity-100 z-20"
                        (mousedown)="startResize($event, idx)"></span>
                </th>
              </ng-container>

              <th *ngIf="config.actions?.length"
                  class="py-2 px-4 font-semibold text-right text-sm bg-highlight text-highlight-contrast border-0"
                  [style.width.px]="actionsWidth">
                Actions
              </th>
            </tr>
          </thead>
        </ng-container>

        <!-- BODY -->
        <tbody>
          <tr *ngIf="loading">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted bg-card">Loading…</td>
          </tr>
          <tr *ngIf="!loading && pageData.length === 0">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted bg-card">No data found.</td>
          </tr>

          <tr *ngFor="let row of pageData" class="hover:bg-hover transition">
            <ng-container *ngFor="let col of config.columns; trackBy: trackByField">
              <td class="py-1 px-4 truncate text-sm border-0" [style.width]="col.width">
                {{ row[col.field] ?? '—' }}
              </td>
            </ng-container>
            <td *ngIf="config.actions?.length"
                class="py-1 px-4 text-right space-x-1 border-0" [style.width.px]="actionsWidth">
              <ng-container *ngFor="let act of config.actions">
                <button type="button"
                        class="px-2 py-1 rounded font-semibold text-sm transition"
                        [ngClass]="act.colorClass || 'bg-primary text-primary-contrast hover:bg-secondary hover:text-secondary-contrast'"
                        (click)="act.callback(row)">{{ act.label }}</button>
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
          <span class="text-muted text-xs">Page {{ page }} of {{ totalPages }} ({{ total }} items)</span>
          <div class="flex items-center gap-2">
            <select *ngIf="pageSizeOptions.length > 1"
                    [(ngModel)]="pageSize" (change)="updatePagedData()"
                    class="rounded border border-input-border px-2 py-1 text-xs bg-input-background text-input-text">
              <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}/page</option>
            </select>
            <button class="px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80"
                    [disabled]="page <= 1" (click)="prevPage()">&larr;</button>
            <button class="px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80"
                    [disabled]="page >= totalPages" (click)="nextPage()">&rarr;</button>
          </div>
        </div>
      </div>
    </ng-container>
  `
})
export class TableGridComponent<T extends Record<string, any>> implements OnChanges {
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() loading = false;
  @ViewChild('scrollRef', { static: false }) scrollRef!: ElementRef<HTMLDivElement>;

  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;
  pageSize = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];
  total = 0;
  totalPages = 1;
  pageData: T[] = [];

  resizingActive = false;
  leftColIdx = -1;
  startX = 0;
  leftStartW = 0;
  rightStartW = 0;
  resizeLinePx = 0;
  startLineOffset = 0;
  actionsWidth = 120;

  ngOnChanges() {
    this.ensureWidths();
    this.updatePagedData();
  }

  ensureWidths() {
    if (!this.config?.columns) { return; }
    this.config.columns.forEach(c => { if (!c.width) c.width = '160px'; });
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

  startResize(ev: MouseEvent, idx: number) {
    ev.preventDefault();
    this.resizingActive = true;
    this.leftColIdx = idx;
    this.startX = ev.clientX;

    this.leftStartW = parseInt(this.config.columns[idx].width!, 10);
    this.rightStartW = parseInt(this.config.columns[idx + 1].width!, 10);

    const rect = this.scrollRef.nativeElement.getBoundingClientRect();
    const scroll = this.scrollRef.nativeElement.scrollLeft;
    this.startLineOffset = ev.clientX - rect.left + scroll;
    this.resizeLinePx = this.startLineOffset;

    document.body.style.cursor = 'col-resize';
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(ev: MouseEvent) {
    if (!this.resizingActive) return;

    const dx = ev.clientX - this.startX;
    const total = this.leftStartW + this.rightStartW;
    const minW = 48;

    let newLeftW = this.leftStartW + dx;
    newLeftW = Math.min(Math.max(newLeftW, minW), total - minW);
    const newRightW = total - newLeftW;

    this.config.columns[this.leftColIdx].width = `${newLeftW}px`;
    this.config.columns[this.leftColIdx + 1].width = `${newRightW}px`;

    this.resizeLinePx = this.startLineOffset + dx;
  }

  @HostListener('document:mouseup')
  stopResize() {
    if (this.resizingActive) {
      this.resizingActive = false;
      document.body.style.cursor = '';
    }
  }

  trackByField(index: number, col: TableGridColumn<T>) {
    return col.field;
  }
}
