import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TableGridColumnBase {
  label: string;
  width?: string;
  customClass?: string;
  /** Horizontal alignment: left | center | right **/
  alignHorizontal?: 'left' | 'center' | 'right';
  /** Vertical alignment: top | middle | bottom **/
  alignVertical?: 'top' | 'middle' | 'bottom';
  /** Hide or show column **/
  hidden?: boolean;
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
<div class="w-full h-full flex flex-col rounded shadow min-w-[720px] overflow-hidden bg-card text-card-contrast">

  <div class="flex-1 min-h-0 overflow-x-auto">
    <table class="w-full table-fixed">
      <thead *ngIf="config.showHeader ?? true" class="sticky top-0 z-10 bg-highlight border-b border-border">
        <tr>
          <ng-container *ngFor="let col of visibleColumns; trackBy: trackByField">
            <th
              [style.width]="col.width"
              [ngClass]="{
                'cursor-pointer': col.sortable,
                'hover:bg-primary hover:text-primary-contrast': col.sortable,
                'border-r border-border': config.showVerticalLines,
                'text-center': col.alignHorizontal === 'center',
                'text-right': col.alignHorizontal === 'right',
                'align-top': col.alignVertical === 'top',
                'align-middle': col.alignVertical === 'middle',
                'align-bottom': col.alignVertical === 'bottom'
              }"
              class="py-2 px-4 font-semibold text-sm text-left bg-secondary/50 text-highlight-contrast select-none"
              (click)="col.sortable && onSort(col.field)">
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
              [style.width]="config.actions.width"
              [ngClass]="{
                'border-r border-border': config.showVerticalLines,
                'text-center': config.actions.alignHorizontal === 'center',
                'text-right': config.actions.alignHorizontal === 'right',
                'align-middle': config.actions.alignVertical === 'middle'
              }"
              class="py-2 px-4 font-semibold text-sm bg-secondary/50 text-highlight-contrast">
            {{ config.actions.label }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr *ngIf="loading">
          <td [attr.colspan]="visibleColumns.length + (config.actions ? 1 : 0)"
              class="py-8 text-center text-muted bg-card">
            Loading…
          </td>
        </tr>
        <tr *ngIf="!loading && pageData.length === 0">
          <td [attr.colspan]="visibleColumns.length + (config.actions ? 1 : 0)"
              class="py-8 text-center text-muted bg-card">
            No data found.
          </td>
        </tr>

        <tr *ngFor="let row of pageData" class="hover:bg-highlight transition">
          <ng-container *ngFor="let col of visibleColumns; trackBy: trackByField">
            <td
              [style.width]="col.width"
              [ngClass]="{
                'border-r border-border': config.showVerticalLines,
                'border-b border-border': config.showHorizontalLines,
                'text-center': col.alignHorizontal === 'center',
                'text-right': col.alignHorizontal === 'right',
                'align-top': col.alignVertical === 'top',
                'align-middle': col.alignVertical === 'middle',
                'align-bottom': col.alignVertical === 'bottom'
              }"
              class="py-1 px-4 truncate text-sm {{ col.customClass || '' }}">
              {{ row[col.field] ?? '—' }}
            </td>
          </ng-container>

          <td *ngIf="config.actions"
              [style.width]="config.actions.width"
              [ngClass]="{
                'border-r border-border': config.showVerticalLines,
                'border-b border-border': config.showHorizontalLines,
                'text-center': config.actions.alignHorizontal === 'center',
                'text-right': config.actions.alignHorizontal === 'right',
                'align-middle': config.actions.alignVertical === 'middle'
              }"
              class="py-1 px-4 space-x-1">
            <ng-container *ngFor="let act of config.actions.actions">
              <button
                type="button"
                (click)="act.callback(row)"
                [ngClass]="act.colorClass || 'bg-primary text-primary-contrast hover:bg-secondary hover:text-secondary-contrast'"
                class="px-2 py-1 rounded font-semibold text-sm transition">
                {{ act.label }}
              </button>
            </ng-container>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

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
export class TableGridComponent<T extends Record<string, any>> implements OnChanges {
  @Input() config!: TableGridConfig<T>;
  @Input() data: T[] = [];
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0;
  @Input() loading = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() pageRequest = new EventEmitter<{
    page: number;
    pageSize: number;
    sortColumn: string | null;
    sortDir: 'asc' | 'desc' | null;
  }>();

  sortColumn: string | null = null;
  sortDir: 'asc' | 'desc' | null = null;

  totalPages = 1;
  pageSizeOptions: number[] = [10, 20, 50, 100];
  pageData: T[] = [];

  visibleColumns: TableGridColumn<T>[] = [];

  ngOnChanges(): void {
    // update visibleColumns
    this.visibleColumns = this.config.columns.filter(c => !c.hidden);

    // update pageSizeOptions & totalPages
    this.pageSizeOptions = this.config.pageSizeOptions ?? this.pageSizeOptions;
    this.totalPages = Math.ceil(this.total / this.pageSize) || 1;

    // sort & pageData
    this.updateDisplay();
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
        return this.sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
    }
    this.pageData = items;
  }

  onRefresh() {
    this.refresh.emit();
  }

  onSort(field: string | keyof T) {
    if (this.sortColumn === field) {
      this.sortDir = this.sortDir === 'asc'
        ? 'desc'
        : this.sortDir === 'desc'
          ? null
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
      page: this.page,
      pageSize: this.pageSize,
      sortColumn: this.sortColumn,
      sortDir: this.sortDir
    });
  }
}
