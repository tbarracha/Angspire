import { Component, inject, signal, computed, effect, InjectionToken, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TableGridComponent,
  TableGridConfig,
  TableGridAction
} from '../../../lib/components/ui/table-component/table-grid.component';

import { InputComponent } from '../../../lib/components/ui-primitives/input.component';
import { MODAL_CLOSE, ModalService } from '../../../lib/components/ui/modal-components/modal.service';


import { finalize } from 'rxjs';
import { TagCategoriesService } from '../../../modules/identity/tags/services/tag-categories.service';
import { TagCategoryDto, CreateTagCategoryRequest, UpdateTagCategoryRequest } from '../../../modules/identity/tags/dtos/tag-category-dtos';
import { TagDto, CreateTagRequest, UpdateTagRequest } from '../../../modules/identity/tags/dtos/tag-dtos';
import { TagsService } from '../../../modules/identity/tags/services/tags.service';

/* ============================================================
   Inner Form Tokens & Data
   ============================================================ */
export interface CategoryFormData {
  mode: 'create' | 'edit';
  initial?: Partial<TagCategoryDto>;
  categories?: TagCategoryDto[]; // for parent selection
}
export const CATEGORY_FORM_DATA = new InjectionToken<CategoryFormData>('CATEGORY_FORM_DATA');

export interface TagFormData {
  mode: 'create' | 'edit';
  initial?: Partial<TagDto>;
  categories: TagCategoryDto[];   // required for category select
  tags: TagDto[];                 // for parent tag select
}
export const TAG_FORM_DATA = new InjectionToken<TagFormData>('TAG_FORM_DATA');

/* ============================================================
   Category Form
   ============================================================ */
@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent],
  template: `
  <div class="flex flex-col gap-3">
    <input-component
      id="cat-name"
      [label]="'Name' + (mode==='create' ? ' *' : '')"
      type="text"
      [value]="name"
      placeholder="Category name"
      (valueChange)="name = $event"
      [height]="40"
    ></input-component>

    <input-component
      id="cat-description"
      label="Description"
      type="text"
      [value]="description ?? ''"
      placeholder="Optional description"
      (valueChange)="description = $event"
      [height]="40"
    ></input-component>

    <div class="grid grid-cols-2 gap-3">
      <input-component
        id="cat-icon"
        label="Icon"
        type="text"
        [value]="icon ?? ''"
        placeholder="e.g. 'tag'"
        (valueChange)="icon = $event"
        [height]="40"
      ></input-component>

      <input-component
        id="cat-iconType"
        label="Icon Type"
        type="text"
        [value]="iconType ?? ''"
        placeholder="e.g. 'lucide'"
        (valueChange)="iconType = $event"
        [height]="40"
      ></input-component>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-semibold">Parent Category</label>
      <select class="input h-10 px-3 rounded-2xl border border-primary bg-input-background text-input-text"
              [(ngModel)]="parentCategoryId">
        <option [ngValue]="null">— none —</option>
        @for (c of parentOptions; track c.id) {
          <option [ngValue]="c.id">{{ c.name }}</option>
        }
      </select>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button class="px-4 py-2 rounded bg-secondary text-secondary-contrast" (click)="close(null)">Cancel</button>
      <button class="px-4 py-2 rounded bg-accent text-light" (click)="submit()">Save</button>
    </div>
  </div>
  `
})
export class CategoryFormComponent {
  private closeFn = inject<(res?: any) => void>(MODAL_CLOSE);

  mode: 'create' | 'edit' = 'create';
  id = '';
  name = '';
  description: string | null = null;
  icon: string | null = null;
  iconType: string | null = null;
  parentCategoryId: string | null = null;

  parentOptions: TagCategoryDto[] = [];

  constructor(@Inject(CATEGORY_FORM_DATA) data: CategoryFormData) {
    this.mode = data.mode;
    const i = data.initial ?? {};
    this.id = i.id ?? '';
    this.name = i.name ?? '';
    this.description = i.description ?? '';
    this.icon = i.icon ?? '';
    this.iconType = i.iconType ?? '';
    this.parentCategoryId = i.parentCategoryId ?? null;

    // exclude self from parent options on edit
    const all = data.categories ?? [];
    this.parentOptions = this.id
      ? all.filter(c => c.id !== this.id)
      : all.slice();
  }

  close(res: any) { this.closeFn(res); }

  submit() {
    if (this.mode === 'create' && !this.name.trim()) return;
    this.close({
      id: this.id || null,
      name: this.name.trim(),
      description: this.description?.trim() || null,
      icon: this.icon?.trim() || null,
      iconType: this.iconType?.trim() || null,
      parentCategoryId: this.parentCategoryId || null
    });
  }
}

/* ============================================================
   Tag Form
   ============================================================ */
@Component({
  selector: 'app-tag-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent],
  template: `
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-semibold">Category <span class="text-red-500">*</span></label>
      <select class="input h-10 px-3 rounded-2xl border border-primary bg-input-background text-input-text"
              [(ngModel)]="categoryId"
              (ngModelChange)="onCategoryChange()">
        <option [ngValue]="''">— select category —</option>
        @for (c of categories; track c.id) {
          <option [ngValue]="c.id">{{ c.name }}</option>
        }
      </select>
    </div>

    <input-component
      id="tag-displayName"
      [label]="'Tag Name' + (mode==='create' ? ' *' : '')"
      type="text"
      [value]="displayName"
      placeholder="e.g. Text, Image, Reasoning"
      (valueChange)="displayName = $event"
      [height]="40"
    ></input-component>

    <input-component
      id="tag-description"
      label="Description"
      type="text"
      [value]="description ?? ''"
      placeholder="Optional description"
      (valueChange)="description = $event"
      [height]="40"
    ></input-component>

    <div class="grid grid-cols-2 gap-3">
      <input-component
        id="tag-icon"
        label="Icon"
        type="text"
        [value]="icon ?? ''"
        placeholder="e.g. 'sparkles'"
        (valueChange)="icon = $event"
        [height]="40"
      ></input-component>

      <input-component
        id="tag-iconType"
        label="Icon Type"
        type="text"
        [value]="iconType ?? ''"
        placeholder="e.g. 'lucide'"
        (valueChange)="iconType = $event"
        [height]="40"
      ></input-component>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-semibold">Parent Tag</label>
      <select class="input h-10 px-3 rounded-2xl border border-primary bg-input-background text-input-text"
              [(ngModel)]="parentTagId">
        <option [ngValue]="null">— none —</option>
        @for (t of parentTagOptions; track t.id) {
          <option [ngValue]="t.id">{{ t.displayName }}</option>
        }
      </select>
      <div class="text-xs text-tertiary">Filtered to current category.</div>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button class="px-4 py-2 rounded bg-secondary text-secondary-contrast" (click)="close(null)">Cancel</button>
      <button class="px-4 py-2 rounded bg-accent text-light" (click)="submit()">Save</button>
    </div>
  </div>
  `
})
export class TagFormComponent {
  private closeFn = inject<(res?: any) => void>(MODAL_CLOSE);

  mode: 'create' | 'edit' = 'create';

  // core fields
  id = '';
  categoryId = '';
  displayName = '';
  description: string | null = null;
  icon: string | null = null;
  iconType: string | null = null;
  parentTagId: string | null = null;

  // data sources
  categories: TagCategoryDto[] = [];
  tags: TagDto[] = [];

  // filtered options
  parentTagOptions: TagDto[] = [];

  constructor(@Inject(TAG_FORM_DATA) data: TagFormData) {
    this.mode = data.mode;
    const i = data.initial ?? {};

    this.id = i.id ?? '';
    this.categoryId = i.categoryId ?? '';
    this.displayName = i.displayName ?? '';
    this.description = i.description ?? '';
    this.icon = i.icon ?? '';
    this.iconType = i.iconType ?? '';
    this.parentTagId = i.parentTagId ?? null;

    this.categories = data.categories ?? [];
    this.tags = data.tags ?? [];

    this.onCategoryChange();
  }

  onCategoryChange() {
    const cid = this.categoryId;
    this.parentTagOptions = (this.tags || []).filter(t => t.categoryId === cid && t.id !== this.id);
    // if current parent tag not in options (changed category), clear it
    if (this.parentTagId && !this.parentTagOptions.some(t => t.id === this.parentTagId)) {
      this.parentTagId = null;
    }
  }

  close(res: any) { this.closeFn(res); }

  submit() {
    if (!this.categoryId) return;
    if (this.mode === 'create' && !this.displayName.trim()) return;

    this.close({
      id: this.id || null,
      categoryId: this.categoryId,
      displayName: this.displayName.trim(),
      description: this.description?.trim() || null,
      icon: this.icon?.trim() || null,
      iconType: this.iconType?.trim() || null,
      parentTagId: this.parentTagId || null
    });
  }
}

/* ============================================================
   Main Admin Page: Tags & Categories
   ============================================================ */
type CategoryRow = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconType?: string;
  parentName?: string;
};

type TagRow = {
  id: string;
  displayName: string;
  categoryName: string;
  parentTagName?: string;
  icon?: string;
  iconType?: string;
  description?: string;
};

@Component({
  selector: 'app-tags-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TableGridComponent],
  template: `
  <section class="p-6 space-y-10">
    <!-- Categories -->
    <header class="mb-2 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Tag Categories</h2>
      <div class="flex gap-2">
        <button class="btn btn-secondary" (click)="refreshCategories(true)">↻ Refresh</button>
        <button class="btn btn-primary" (click)="createCategory()">Create Category</button>
      </div>
    </header>

    <app-table-grid
      [config]="categoriesGridConfig"
      [data]="categoryRows()"
      [loading]="loadingCategories()"
      [page]="categoriesPage()"
      [pageSize]="categoriesPageSize()"
      [total]="categoryRows().length"
      (refresh)="refreshCategories(true)"
      (pageRequest)="onCategoriesPageRequest($event)"
    ></app-table-grid>

    <!-- Tags -->
    <header class="mt-8 mb-2 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Tags</h2>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm">Filter by Category:</span>
          <select class="input h-9 px-3 rounded-2xl border border-primary bg-input-background text-input-text"
                  [(ngModel)]="selectedCategoryId">
            <option [ngValue]="''">All</option>
            @for (c of _categories(); track c.id) {
              <option [ngValue]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>
        <button class="btn btn-secondary" (click)="refreshTags(true)">↻ Refresh</button>
        <button class="btn btn-primary" (click)="createTag()">Create Tag</button>
      </div>
    </header>

    <app-table-grid
      [config]="tagsGridConfig"
      [data]="tagRows()"
      [loading]="loadingTags()"
      [page]="tagsPage()"
      [pageSize]="tagsPageSize()"
      [total]="tagRows().length"
      (refresh)="refreshTags(true)"
      (pageRequest)="onTagsPageRequest($event)"
    ></app-table-grid>
  </section>
  `
})
export class TagsAdminPageComponent {
  private readonly modal = inject(ModalService);
  private readonly categoriesApi = inject(TagCategoriesService);
  private readonly tagsApi = inject(TagsService);

  // Throttle / in-flight guards
  private static readonly MIN_REFRESH_MS = 1500;
  private categoriesReqInFlight = signal(false);
  private tagsReqInFlight = signal(false);
  private categoriesLastFetchAt = signal(0);
  private tagsLastFetchAt = signal(0);

  // Data
  _categories = signal<TagCategoryDto[]>([]);
  _tags = signal<TagDto[]>([]);

  // Lookups
  private categoryById = computed<Record<string, TagCategoryDto>>(() => {
    const map: Record<string, TagCategoryDto> = {};
    for (const c of this._categories()) map[c.id] = c;
    return map;
  });
  private tagById = computed<Record<string, TagDto>>(() => {
    const map: Record<string, TagDto> = {};
    for (const t of this._tags()) map[t.id] = t;
    return map;
  });

  // UI state
  loadingCategories = signal(false);
  loadingTags = signal(false);
  selectedCategoryId = signal<string>('');

  // Paging
  private _categoriesPage = signal(1);
  private _categoriesPageSize = signal(20);
  private _tagsPage = signal(1);
  private _tagsPageSize = signal(20);

  categoriesPage = this._categoriesPage.asReadonly();
  categoriesPageSize = this._categoriesPageSize.asReadonly();
  tagsPage = this._tagsPage.asReadonly();
  tagsPageSize = this._tagsPageSize.asReadonly();

  // Rows
  categoryRows = signal<CategoryRow[]>([]);
  tagRows = signal<TagRow[]>([]);

  // Grid configs
  categoriesGridConfig: TableGridConfig<CategoryRow> = {
    showHeader: true,
    showFooter: true,
    showVerticalLines: false,
    showHorizontalLines: true,
    pageSizeOptions: [10, 20, 50, 100],
    columns: [
      { label: 'Name',        field: 'name',        width: '16rem', sortable: true },
      { label: 'Description', field: 'description', width: '22rem', sortable: true },
      { label: 'Icon',        field: 'icon',        width: '10rem', sortable: true },
      { label: 'Icon Type',   field: 'iconType',    width: '10rem', sortable: true },
      { label: 'Parent',      field: 'parentName',  width: '16rem', sortable: true }
    ],
    actions: <TableGridAction>{
      label: 'Actions',
      width: '16rem',
      alignHorizontal: 'center',
      actions: [
        {
          label: 'Edit',
          colorClass: 'bg-primary text-primary-contrast hover:bg-primary/80',
          callback: (row) => this.editCategory(row.id)
        },
        {
          label: 'Delete',
          colorClass: 'bg-error text-error-contrast hover:bg-error/80',
          callback: (row) => this.deleteCategory(row.id)
        }
      ]
    }
  };

  tagsGridConfig: TableGridConfig<TagRow> = {
    showHeader: true,
    showFooter: true,
    showVerticalLines: false,
    showHorizontalLines: true,
    pageSizeOptions: [10, 20, 50, 100],
    columns: [
      { label: 'Name',        field: 'displayName',  width: '16rem', sortable: true },
      { label: 'Category',    field: 'categoryName', width: '16rem', sortable: true },
      { label: 'Parent Tag',  field: 'parentTagName',width: '16rem', sortable: true },
      { label: 'Icon',        field: 'icon',         width: '10rem', sortable: true },
      { label: 'Icon Type',   field: 'iconType',     width: '10rem', sortable: true },
      { label: 'Description', field: 'description',  width: '24rem', sortable: true }
    ],
    actions: <TableGridAction>{
      label: 'Actions',
      width: '16rem',
      alignHorizontal: 'center',
      actions: [
        {
          label: 'Edit',
          colorClass: 'bg-primary text-primary-contrast hover:bg-primary/80',
          callback: (row) => this.editTag(row.id)
        },
        {
          label: 'Delete',
          colorClass: 'bg-error text-error-contrast hover:bg-error/80',
          callback: (row) => this.deleteTag(row.id)
        }
      ]
    }
  };

  constructor() {
    // Initial loads (guarded)
    this.refreshCategories(false);
    this.refreshTags(false);

    // Build category rows on changes
    effect(() => {
      const cats = this._categories();
      const map = this.categoryById();
      const rows: CategoryRow[] = cats.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        iconType: c.iconType,
        parentName: c.parentCategoryId ? map[c.parentCategoryId]?.name ?? '—' : '—'
      }));
      this.categoryRows.set(rows);
    });

    // Build tag rows, filtered by category if selected
    effect(() => {
      const tags = this._tags();
      const cats = this.categoryById();
      const tagsById = this.tagById();
      const filterCid = this.selectedCategoryId();

      const filtered = filterCid ? tags.filter(t => t.categoryId === filterCid) : tags;

      const rows: TagRow[] = filtered.map(t => ({
        id: t.id,
        displayName: t.displayName,
        categoryName: cats[t.categoryId]?.name ?? '—',
        parentTagName: t.parentTagId ? tagsById[t.parentTagId]?.displayName ?? '—' : '—',
        icon: t.icon,
        iconType: t.iconType,
        description: t.description
      }));
      this.tagRows.set(rows);
    });
  }

  /* Paging events */
  onCategoriesPageRequest(e: { page: number; pageSize: number }) {
    this._categoriesPage.set(e.page);
    this._categoriesPageSize.set(e.pageSize);
  }
  onTagsPageRequest(e: { page: number; pageSize: number }) {
    this._tagsPage.set(e.page);
    this._tagsPageSize.set(e.pageSize);
  }

  /* =============== Categories CRUD =============== */
  refreshCategories(force = false) {
    const now = Date.now();
    if (!force) {
      if (this.categoriesReqInFlight()) return;
      if (now - this.categoriesLastFetchAt() < TagsAdminPageComponent.MIN_REFRESH_MS) return;
    }
    this.categoriesReqInFlight.set(true);
    this.loadingCategories.set(true);

    this.categoriesApi.listCategories()
      .pipe(finalize(() => {
        this.categoriesReqInFlight.set(false);
        this.categoriesLastFetchAt.set(Date.now());
        this.loadingCategories.set(false);
      }))
      .subscribe({
        next: (res) => this._categories.set(res ?? []),
        error: () => { /* handled */ }
      });
  }

  createCategory() {
    const categoriesSnapshot = this._categories();
    const h = this.modal.open<CategoryFormComponent, any>(
      CategoryFormComponent,
      [{ provide: CATEGORY_FORM_DATA, useValue: { mode: 'create' as const, categories: categoriesSnapshot } }],
      { title: 'Create Tag Category', hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingCategories.set(true);
      const payload: CreateTagCategoryRequest = {
        name: result.name,
        description: result.description || undefined,
        icon: result.icon || undefined,
        iconType: result.iconType || undefined,
        parentCategoryId: result.parentCategoryId || undefined
      };
      this.categoriesApi.createCategory(payload).subscribe({
        next: _ => this.refreshCategories(true),
        error: _ => this.loadingCategories.set(false)
      });
    });
  }

  editCategory(id: string) {
    const current = this._categories().find(c => c.id === id);
    if (!current) return;

    const categoriesSnapshot = this._categories();
    const h = this.modal.open<CategoryFormComponent, any>(
      CategoryFormComponent,
      [{ provide: CATEGORY_FORM_DATA, useValue: { mode: 'edit' as const, initial: current, categories: categoriesSnapshot } }],
      { title: `Edit Category: ${current.name}`, hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingCategories.set(true);
      const payload: UpdateTagCategoryRequest = {
        id,
        name: result.name || undefined,
        description: result.description || undefined,
        icon: result.icon || undefined,
        iconType: result.iconType || undefined,
        parentCategoryId: result.parentCategoryId || undefined
      };
      this.categoriesApi.updateCategory(payload).subscribe({
        next: _ => this.refreshCategories(true),
        error: _ => this.loadingCategories.set(false)
      });
    });
  }

  deleteCategory(id: string) {
    const current = this._categories().find(c => c.id === id);
    const label = current ? current.name : 'this category';
    this.modal.confirm(
      `Delete ${label}?`,
      'Confirm Delete',
      'Delete',
      'Cancel',
      'px-4 py-2 rounded-full bg-highlight text-highlight-contrast',
      'px-4 py-2 rounded-full bg-secondary text-secondary-contrast'
    ).subscribe(ok => {
      if (!ok) return;
      this.loadingCategories.set(true);
      this.categoriesApi.deleteCategory(id).subscribe({
        next: _ => this.refreshCategories(true),
        error: _ => this.loadingCategories.set(false)
      });
    });
  }

  /* =============== Tags CRUD =============== */
  refreshTags(force = false) {
    const now = Date.now();
    if (!force) {
      if (this.tagsReqInFlight()) return;
      if (now - this.tagsLastFetchAt() < TagsAdminPageComponent.MIN_REFRESH_MS) return;
    }
    this.tagsReqInFlight.set(true);
    this.loadingTags.set(true);

    this.tagsApi.listTags({ sortBy: 'displayName', sortDir: 'asc' })
      .pipe(finalize(() => {
        this.tagsReqInFlight.set(false);
        this.tagsLastFetchAt.set(Date.now());
        this.loadingTags.set(false);
      }))
      .subscribe({
        next: (res) => this._tags.set(res ?? []),
        error: () => { /* handled */ }
      });
  }

  createTag() {
    const cats = this._categories();
    const tags = this._tags();

    const h = this.modal.open<TagFormComponent, any>(
      TagFormComponent,
      [{ provide: TAG_FORM_DATA, useValue: { mode: 'create' as const, categories: cats, tags } }],
      { title: 'Create Tag', hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingTags.set(true);
      const payload: CreateTagRequest = {
        categoryId: result.categoryId,
        displayName: result.displayName,
        description: result.description || undefined,
        icon: result.icon || undefined,
        iconType: result.iconType || undefined,
        parentTagId: result.parentTagId || undefined
      };
      this.tagsApi.createTag(payload).subscribe({
        next: _ => this.refreshTags(true),
        error: _ => this.loadingTags.set(false)
      });
    });
  }

  editTag(id: string) {
    const current = this._tags().find(t => t.id === id);
    if (!current) return;

    const cats = this._categories();
    const tags = this._tags();

    const h = this.modal.open<TagFormComponent, any>(
      TagFormComponent,
      [{ provide: TAG_FORM_DATA, useValue: { mode: 'edit' as const, initial: current, categories: cats, tags } }],
      { title: `Edit Tag: ${current.displayName}`, hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingTags.set(true);
      const payload: UpdateTagRequest = {
        id,
        displayName: result.displayName || undefined,
        description: result.description || undefined,
        icon: result.icon || undefined,
        iconType: result.iconType || undefined,
        categoryId: result.categoryId || undefined,
        parentTagId: result.parentTagId || undefined
      };
      this.tagsApi.updateTag(payload).subscribe({
        next: _ => this.refreshTags(true),
        error: _ => this.loadingTags.set(false)
      });
    });
  }

  deleteTag(id: string) {
    const current = this._tags().find(t => t.id === id);
    const label = current ? current.displayName : 'this tag';
    this.modal.confirm(
      `Delete ${label}?`,
      'Confirm Delete',
      'Delete',
      'Cancel',
      'px-4 py-2 rounded-full bg-highlight text-highlight-contrast',
      'px-4 py-2 rounded-full bg-secondary text-secondary-contrast'
    ).subscribe(ok => {
      if (!ok) return;
      this.loadingTags.set(true);
      this.tagsApi.deleteTag(id).subscribe({
        next: _ => this.refreshTags(true),
        error: _ => this.loadingTags.set(false)
      });
    });
  }
}
