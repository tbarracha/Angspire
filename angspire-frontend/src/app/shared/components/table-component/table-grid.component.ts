import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGridConfig, TableGridColumn } from './table-interfaaces';

@Component({
  selector: 'app-table-grid',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      <table class="w-full border bg-card text-card-contrast rounded shadow min-w-[720px]">
        <thead>
          <tr class="bg-highlight border-b border-border sticky top-0 z-10">
            <th *ngFor="let col of config.columns"
                class="py-2 px-4 font-semibold"
                [style.width]="col.width"
                [ngClass]="{'cursor-pointer select-none': col.sortable}"
                (click)="col.sortable && sortBy(col)">
              {{ col.label }}
              <span *ngIf="col.sortable">
                <ng-container *ngIf="sortColumn === col.field">
                  <span *ngIf="sortDir === 'asc'">&#8593;</span>
                  <span *ngIf="sortDir === 'desc'">&#8595;</span>
                </ng-container>
              </span>
            </th>
            <th *ngIf="config.actions?.length" class="py-2 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="loading">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted">Loading...</td>
          </tr>
          <tr *ngIf="!loading && pageData.length === 0">
            <td [attr.colspan]="config.columns.length + (config.actions?.length ? 1 : 0)"
                class="py-8 text-center text-muted">No data found.</td>
          </tr>
          <tr *ngFor="let row of pageData">
            <td *ngFor="let col of config.columns" class="py-2 px-4 truncate">
              {{ row[col.field] ?? '—' }}
            </td>
            <td *ngIf="config.actions?.length" class="py-2 px-4 text-right space-x-1">
              <ng-container *ngFor="let act of config.actions">
                <button
                  type="button"
                  class="px-2 py-1 rounded font-semibold"
                  [ngClass]="act.colorClass || 'text-primary'"
                  (click)="act.callback(row)"
                >
                  {{ act.label }}
                </button>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination -->
      <div class="flex items-center justify-between py-4">
        <div class="text-muted text-sm">
          Page {{ page }} of {{ totalPages }} ({{ total }} items)
        </div>
        <div class="flex items-center gap-2">
          <select *ngIf="pageSizeOptions.length > 1"
                  [(ngModel)]="pageSize"
                  (change)="updatePagedData()"
                  class="rounded border px-2 py-1 text-sm bg-input-background text-input-text">
            <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}/page</option>
          </select>
          <button class="px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 transition"
                  [disabled]="page <= 1" (click)="prevPage()">&larr;</button>
          <button class="px-3 py-1 rounded bg-secondary text-secondary-contrast font-bold hover:bg-secondary/80 transition"
                  [disabled]="page >= totalPages" (click)="nextPage()">&rarr;</button>
        </div>
      </div>
    </div>
  `
})
export class TableGridComponent<T extends Record<string, any>> implements OnChanges {
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() loading = false;

  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  page = 1;
  pageSize = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  pageData: T[] = [];
  total = 0;
  totalPages = 1;

  ngOnChanges() {
    if (this.config?.pageSizeOptions) {
      this.pageSizeOptions = this.config.pageSizeOptions;
    }
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
}
