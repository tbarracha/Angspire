// pages/tags-admin-page.component.ts
import { Component, computed, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OptionItem } from '../../../spire-lib/ui-kit/option-list-components/option-item.model';
import { TableGridComponent, TableGridColumn, TableGridAction, TableGridConfig } from '../../../spire-lib/ui-kit/table-component/table-grid.component';


type Tag = {
  id?: string;           // assigned by backend
  name: string;
  categoryId?: string | null;
  usageCount?: number;
};

type TagCategory = {
  id?: string;           // assigned by backend
  name: string;
  color?: string | null; // optional visual hint
};

@Component({
  selector: 'app-tags-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TableGridComponent],
  template: `
  <section class="p-6 space-y-4">
    <!-- Header -->
    <header class="mb-2 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Tags</h2>
      <div class="flex gap-2">
        <button class="btn btn-secondary" (click)="toggleAddCategory()">
          @if (!showAddCategory()) { Add Category } @else { Close }
        </button>
        <button class="btn btn-primary" (click)="toggleAddTag()">
          @if (!showAddTag()) { Add Tag } @else { Close }
        </button>
      </div>
    </header>

    <!-- Add Category Row -->
    @if (showAddCategory()) {
      <div class="rounded border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label class="flex items-center gap-2">
            <span class="w-28 text-sm text-tertiary">Name</span>
            <input class="input input-bordered w-full"
                   [(ngModel)]="newCategoryName"
                   placeholder="e.g. UI, Backend, Priority" />
          </label>
          <label class="flex items-center gap-2">
            <span class="w-28 text-sm text-tertiary">Color</span>
            <input class="input input-bordered w-full"
                   [(ngModel)]="newCategoryColor"
                   placeholder="optional (e.g. #7c3aed)" />
          </label>
        </div>
        <div class="flex md:justify-end gap-2">
          <button class="btn btn-secondary" (click)="clearCategoryForm()">Reset</button>
          <button class="btn btn-primary" [disabled]="!newCategoryName.trim()" (click)="addCategory()">Create</button>
        </div>
      </div>
    }

    <!-- Add Tag Row -->
    @if (showAddTag()) {
      <div class="rounded border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label class="flex items-center gap-2">
            <span class="w-28 text-sm text-tertiary">Name</span>
            <input class="input input-bordered w-full"
                   [(ngModel)]="newTagName"
                   placeholder="e.g. typography, devops, ux" />
          </label>

          <label class="flex items-center gap-2">
            <span class="w-28 text-sm text-tertiary">Category</span>
            <select class="select select-bordered w-full"
                    [(ngModel)]="newTagCategoryId">
              <option [ngValue]="null">(none)</option>
              @for (c of categories(); track c.name) {
                <option [ngValue]="c.id ?? c.name">{{ c.name }}</option>
              }
            </select>
          </label>

          <label class="flex items-center gap-2">
            <span class="w-28 text-sm text-tertiary">Usage</span>
            <input type="number" min="0" class="input input-bordered w-full"
                   [(ngModel)]="newTagUsage"
                   placeholder="0" />
          </label>
        </div>
        <div class="flex md:justify-end gap-2">
          <button class="btn btn-secondary" (click)="clearTagForm()">Reset</button>
          <button class="btn btn-primary"
                  [disabled]="!newTagName.trim()"
                  (click)="addTag()">Create</button>
        </div>
      </div>
    }

    <!-- Grid -->
    <app-table-grid
      [config]="gridConfig"
      [data]="rows()"
      [page]="page"
      [pageSize]="pageSize"
      [total]="rows().length"
      [loading]="false"
      (pageRequest)="onPage($event)"
      (refresh)="onRefresh()"
      class="block"
    />
  </section>
  `
})
export class TagsAdminPageComponent {
  // --- In-memory data for now (wire to backend later) ---
  readonly categories = signal<TagCategory[]>([
    { name: 'UI',       color: '#60a5fa' },
    { name: 'Backend',  color: '#f59e0b' },
    { name: 'Priority', color: '#ef4444' },
  ]);

  readonly tags = signal<Tag[]>([
    { name: 'typography',  categoryId: 'UI', usageCount: 12 },
    { name: 'buttons',     categoryId: 'UI', usageCount: 8  },
    { name: 'api',         categoryId: 'Backend', usageCount: 20 },
    { name: 'critical',    categoryId: 'Priority', usageCount: 3 },
    { name: 'refactor',    usageCount: 5 },
  ]);

  // --- Add forms ---
  showAddCategory = signal(false);
  showAddTag = signal(false);

  newCategoryName = '';
  newCategoryColor = '';
  newTagName = '';
  newTagCategoryId: string | null = null;
  newTagUsage: number | null = null;

  toggleAddCategory = () => this.showAddCategory.update(v => !v);
  toggleAddTag = () => this.showAddTag.update(v => !v);

  clearCategoryForm() {
    this.newCategoryName = '';
    this.newCategoryColor = '';
  }
  addCategory() {
    const name = this.newCategoryName.trim();
    if (!name) return;
    const exists = this.categories().some(c => (c.id ?? c.name) === name || c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;

    // No frontend IDs: use name as temporary key; backend should assign id later.
    this.categories.update(arr => [...arr, { name, color: this.newCategoryColor?.trim() || null }]);
    this.clearCategoryForm();
    this.showAddCategory.set(false);
  }

  clearTagForm() {
    this.newTagName = '';
    this.newTagCategoryId = null;
    this.newTagUsage = null;
  }
  addTag() {
    const name = this.newTagName.trim();
    if (!name) return;
    const exists = this.tags().some(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) return;

    this.tags.update(arr => [
      ...arr,
      {
        name,
        categoryId: this.newTagCategoryId ?? null,
        usageCount: Math.max(0, Number.isFinite(this.newTagUsage as number) ? (this.newTagUsage as number) : 0),
      }
    ]);
    this.clearTagForm();
    this.showAddTag.set(false);
  }

  // Remove actions
  removeTag = (row: RowView) => {
    this.tags.update(arr => arr.filter(t => t.name !== row.name));
  };

  removeCategory = (categoryName: string) => {
    // remove category; tags pointing to it get categoryId=null
    this.categories.update(arr => arr.filter(c => c.name !== categoryName));
    this.tags.update(arr => arr.map(t => (t.categoryId === categoryName ? { ...t, categoryId: null } : t)));
  };

  // Move tag to category via option items
  moveTagToCategory = (tagName: string, categoryName: string | null) => {
    this.tags.update(arr =>
      arr.map(t => (t.name === tagName ? { ...t, categoryId: categoryName } : t))
    );
  };

  // --- Grid view-model ---
  private categoryLabel = (id?: string | null) => {
    if (!id) return '(none)';
    const c = this.categories().find(x => (x.id ?? x.name) === id || x.name === id);
    return c?.name ?? id;
  };

  private categoryColor = (name?: string | null) => {
    if (!name) return null;
    const c = this.categories().find(x => x.name === name || (x.id ?? x.name) === name);
    return c?.color ?? null;
    }

  // The table rows we’ll render
  readonly rows = computed<RowView[]>(() =>
    this.tags().map(t => ({
      name: t.name,
      category: this.categoryLabel(t.categoryId ?? null),
      color: this.categoryColor(t.categoryId ?? null),
      usage: t.usageCount ?? 0
    }))
  );

  // --- Grid config ---
  page = 1;
  pageSize = 20;

  private readonly columns: TableGridColumn<RowView>[] = [
    {
      field: 'name',
      label: 'Tag',
      sortable: true,
      width: '30%',
      formatter: ({ value }) => String(value ?? '—'),
    },
    {
      field: 'category',
      label: 'Category',
      sortable: true,
      width: '30%',
      formatter: ({ row }) => {
        const color = row.color;
        return {
          html: `<span class="inline-flex items-center gap-2">
                   <span class="inline-block w-3 h-3 rounded-full" style="${color ? `background:${color}` : 'background:transparent; border:1px solid rgba(0,0,0,.15)' }"></span>
                   ${row.category ?? '(none)'}
                 </span>`
        };
      }
    },
    {
      field: 'usage',
      label: 'Usage',
      sortable: true,
      width: '1%',
      alignHorizontal: 'right'
    },
  ];

  // Actions column: quick category assignment via OptionItems + delete
  private readonly actions: TableGridAction<RowView> = {
    label: 'Actions',
    sticky: 'right',
    width: '1%',
    optionItemsWrapperClass: 'flex items-center gap-1',
    optionItems: (row: RowView): OptionItem[] => {
      const items: OptionItem[] = [
        { id: 'none',   label: 'No category', onClick: () => this.moveTagToCategory(row.name, null) },
        ...this.categories().map(c => ({
          id: c.name,
          label: `Move to: ${c.name}`,
          onClick: () => this.moveTagToCategory(row.name, c.name)
        }))
      ];
      return items;
    },
    actions: [
      {
        label: 'Delete',
        colorClass: 'bg-error text-error-contrast hover:bg-error/90',
        callback: (row) => this.removeTag(row)
      }
    ]
  };

  readonly gridConfig: TableGridConfig<RowView> = {
    ariaLabel: 'Tags table',
    columns: this.columns,
    actions: this.actions,
    pageSizeOptions: [10, 20, 50, 100],
    showHeader: true,
    showFooter: true,
    showVerticalLines: false,
    showHorizontalLines: true,
    ui: {
      headerClass: 'uppercase tracking-wide',
      headerCellClass: '',
      headerCellHoverClass: 'hover:bg-primary/15',
      rowClass: '',
      rowHoverClass: 'bg-primary/10',
      cellHoverClass: 'bg-primary/5',
      borders: {
        vertical: 'border-r border-base-300',
        horizontal: 'border-b border-base-200',
        headerBottom: 'border-b border-base-300',
      }
    }
  };

  onRefresh() {
    // hook to reload from backend later
  }
  onPage(e: { page: number; pageSize: number }) {
    this.page = e.page;
    this.pageSize = e.pageSize;
  }
}

type RowView = {
  name: string;
  category: string | null;
  color: string | null;
  usage: number;
};
