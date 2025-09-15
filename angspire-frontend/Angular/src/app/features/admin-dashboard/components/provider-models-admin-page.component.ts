// pages/provider-models-admin-page.component.ts
import { Component, inject, signal, effect, InjectionToken, Inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TableGridComponent,
  TableGridConfig,
  TableGridAction
} from '../../../lib/components/ui/table-component/table-grid.component';

import { ProvidersService } from '../../../modules/gen-ai/providers/providers.service';
import { ProviderModelConfigsService } from '../../../modules/gen-ai/providers/provider-model-configs.service';

import type { ProviderDto } from '../../../modules/gen-ai/providers/provider-dtos';
import type { ProviderModelConfigDto } from '../../../modules/gen-ai/providers/provider-model-config-dtos';
import { MODAL_CLOSE, ModalService } from '../../../lib/components/ui/modal-components/modal.service';

/** UX components */
import { OptionItemListComponent } from '../../../lib/components/ui/option-list-components/option-item-list.component';
import type {
  OptionItem,
  OptionListGroup,
  OptionListConfig
} from '../../../lib/components/ui/option-list-components/option-item.model';
import { InputComponent } from '../../../lib/components/ui/input-components/input.component';


import { finalize } from 'rxjs';
import { TagDto } from '../../../modules/identity/tags/dtos/tag-dtos';
import { ChatPrefsStateService } from '../../../shared/app-state/chat-prefs-state.service';
import { IconEditComponent, IconDeleteComponent } from '../../icons/components';

/* ============================================================
   Inner form data tokens
   ============================================================ */
export interface ProviderFormData {
  mode: 'create' | 'edit';
  initial?: Partial<ProviderDto>;
}
export const PROVIDER_FORM_DATA = new InjectionToken<ProviderFormData>('PROVIDER_FORM_DATA');

export interface ModelFormData {
  mode: 'create' | 'edit';
  initial?: Partial<ProviderModelConfigDto>;
  /** Supply providers so the create form can show a dropdown selector */
  providers?: Pick<ProviderDto, 'name' | 'displayName'>[];
  /** Supply cached AI generation tags from state (no network here) */
  generationTags?: TagDto[];
}
export const MODEL_FORM_DATA = new InjectionToken<ModelFormData>('MODEL_FORM_DATA');

/* ============================================================
   Inner Provider Form Component
   ============================================================ */
@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent],
  template: `
  <div class="flex flex-col gap-3">
    <input-component
      id="prov-name"
      [label]="'Name' + (mode==='create' ? ' *' : '')"
      [type]="'text'"
      [value]="name"
      [placeholder]="'unique-id (required for create)'"
      (valueChange)="name = $event"
      [height]="40"
      [ngClass]="mode==='edit' ? 'opacity-60 pointer-events-none' : ''"
    ></input-component>

    <input-component
      id="prov-displayName"
      label="Display Name"
      type="text"
      [value]="displayName ?? ''"
      placeholder="e.g. OpenAI"
      (valueChange)="displayName = $event"
      [height]="40"
    ></input-component>

    <input-component
      id="prov-apiBaseUrl"
      label="API Base URL"
      type="text"
      [value]="apiBaseUrl ?? ''"
      placeholder="https://api.example.com"
      (valueChange)="apiBaseUrl = $event"
      [height]="40"
    ></input-component>

    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-semibold">Enabled</label>
      <select class="input h-10 px-3 rounded-2xl border border-primary bg-input-background text-input-text"
              [(ngModel)]="enabled">
        <option [ngValue]="true">true</option>
        <option [ngValue]="false">false</option>
      </select>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button class="px-4 py-2 rounded bg-secondary text-secondary-contrast" (click)="close(null)">Cancel</button>
      <button class="px-4 py-2 rounded bg-accent text-light" (click)="submit()">Save</button>
    </div>
  </div>
  `
})
export class ProviderFormComponent {
  private closeFn = inject<(res?: any) => void>(MODAL_CLOSE);
  constructor(@Inject(PROVIDER_FORM_DATA) data: ProviderFormData) {
    this.mode = data.mode;
    const i = data.initial ?? {};
    this.id = i.id ?? '';
    this.name = i.name ?? '';
    this.displayName = i.displayName ?? '';
    this.apiBaseUrl = i.apiBaseUrl ?? '';
    this.enabled = i.enabled ?? true;
  }

  mode: 'create' | 'edit' = 'create';
  id = '';
  name = '';
  displayName: string | null = null;
  apiBaseUrl: string | null = null;
  enabled = true;

  close(res: any) { this.closeFn(res); }
  submit() {
    if (this.mode === 'create' && !this.name.trim()) return;
    this.close({
      id: this.id || null,
      name: this.name.trim(),
      displayName: this.displayName?.trim() || null,
      apiBaseUrl: this.apiBaseUrl?.trim() || null,
      enabled: !!this.enabled
    });
  }
}

/* ============================================================
   Inner Provider Model Form Component (with Provider dropdown)
   + AI Generation Tag suggestions (no network)
   ============================================================ */
@Component({
  selector: 'app-provider-model-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, OptionItemListComponent],
  template: `
  <div class="flex flex-col gap-3 relative">
    <!-- Provider selector (dropdown) -->
    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-semibold">Provider <span class="text-red-500">*</span></label>

      <!-- Readonly text for edit (providerName not editable in update DTO) -->
      <div *ngIf="mode==='edit'" class="h-10 flex items-center px-3 rounded-2xl border border-primary bg-input-background text-input-text opacity-60">
        {{ providerName || '—' }}
      </div>

      <!-- Interactive dropdown for create -->
      <div *ngIf="mode==='create'" class="relative">
        <button type="button"
                class="w-full h-10 px-4 rounded-2xl border border-primary bg-input-background text-input-text flex items-center justify-between"
                (click)="dropdownOpen = !dropdownOpen">
          <span class="truncate">{{ providerName || 'Select a provider…' }}</span>
          <span class="ml-2">▾</span>
        </button>

        <div *ngIf="dropdownOpen"
             class="absolute z-50 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-border bg-card shadow">
          <app-option-item-list
            [groups]="providerGroups"
            [config]="optionListConfig"
            [iconContainerSize]="'40px'"
            [expanded]="true"
          ></app-option-item-list>
        </div>
      </div>
    </div>

    <input-component
      id="model-name"
      [label]="'Model Name' + (mode==='create' ? ' *' : '')"
      type="text"
      [value]="name"
      [placeholder]="'e.g. gpt-4o, qwen2.5, ...'"
      (valueChange)="name = $event"
      [height]="40"
      [ngClass]="mode==='edit' ? 'opacity-60 pointer-events-none' : ''"
    ></input-component>

    <input-component
      id="model-displayName"
      label="Display Name"
      type="text"
      [value]="displayName ?? ''"
      placeholder="Pretty name"
      (valueChange)="displayName = $event"
      [height]="40"
    ></input-component>

    <input-component
      id="model-apiEndpoint"
      label="API Endpoint"
      type="text"
      [value]="apiEndpoint ?? ''"
      placeholder="Override endpoint (optional)"
      (valueChange)="apiEndpoint = $event"
      [height]="40"
    ></input-component>

    <input-component
      id="model-tags"
      label="Tags (comma-separated)"
      type="text"
      [value]="tagsCsv"
      placeholder="e.g. Text, Chat, Image"
      (valueChange)="tagsCsv = $event"
      [height]="40"
    ></input-component>

    <!-- AI Generation Tag suggestions (from state, no network) -->
    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-semibold">AI Generation Tags</label>
      <div class="flex flex-wrap gap-2 max-h-40 overflow-auto border border-border rounded-2xl p-2">
        @for (t of generationTags; track t.id) {
          <button type="button"
                  class="px-2 py-1 rounded-full border text-xs hover:bg-secondary/10"
                  (click)="toggleTag(t.displayName)">
            {{ t.displayName }}
          </button>
        } @empty {
          <div class="text-xs opacity-60">No tags available.</div>
        }
      </div>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button class="px-4 py-2 rounded bg-secondary text-secondary-contrast" (click)="close(null)">Cancel</button>
      <button class="px-4 py-2 rounded bg-accent text-light" (click)="submit()">Save</button>
    </div>
  </div>
  `
})
export class ProviderModelFormComponent {
  private closeFn = inject<(res?: any) => void>(MODAL_CLOSE);

  constructor(@Inject(MODEL_FORM_DATA) data: ModelFormData) {
    this.mode = data.mode;
    const i = data.initial ?? {};
    this.id = i.id ?? '';
    this.providerName = i.providerName ?? '';
    this.name = i.name ?? '';
    this.displayName = i.displayName ?? '';
    this.apiEndpoint = i.apiEndpoint ?? '';
    // prefill CSV from existing tags (edit)
    const existingTags = i.supportedTagNames ?? [];
    this.tagsCsv = (existingTags || []).join(', ');

    // Provider dropdown groups
    const providers = data.providers ?? [];
    this.providerGroups = [{
      title: { label: 'Providers', onClick: () => { } },
      items: providers.map(p => ({
        label: p.displayName || p.name,
        onClick: () => {
          this.providerName = p.name;
          this.dropdownOpen = false;
        }
      }))
    }];

    // AI Generation tags from parent (already cached)
    this.generationTags = data.generationTags ?? [];
  }

  mode: 'create' | 'edit' = 'create';
  id = '';
  providerName = '';
  name = '';
  displayName: string | null = null;
  apiEndpoint: string | null = null;

  // CSV string for tags
  tagsCsv = '';
  // Suggestions (from state)
  generationTags: TagDto[] = [];

  dropdownOpen = false;

  providerGroups: OptionListGroup[] = [];
  optionListConfig: OptionListConfig = {
    showIcon: false,
    showLabel: true,
    rowWidth: '100%',
    classes: {
      textClasses: 'px-3 hover:text-primary',
      bgClasses: 'hover:bg-secondary/10'
    }
  };

  private parseTagsCsv(): string[] {
    return (this.tagsCsv || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => !!s)
      .filter((tag, idx, arr) => arr.indexOf(tag) === idx);
  }

  /** Click a suggestion chip to add/remove from CSV */
  toggleTag(tagName: string) {
    const parts = this.parseTagsCsv();
    const idx = parts.findIndex(p => p.toLowerCase() === tagName.toLowerCase());
    if (idx >= 0) {
      parts.splice(idx, 1);
    } else {
      parts.push(tagName);
    }
    this.tagsCsv = parts.join(', ');
  }

  close(res: any) { this.closeFn(res); }

  submit() {
    if (!this.providerName.trim()) return;
    if (this.mode === 'create' && !this.name.trim()) return;

    const supportedTagNames = this.parseTagsCsv();

    this.close({
      id: this.id || null,
      providerName: this.providerName.trim(),
      name: this.name.trim(),
      displayName: this.displayName?.trim() || null,
      apiEndpoint: this.apiEndpoint?.trim() || null,
      supportedTagNames
    });
  }
}

/* ============================================================
   Main Admin Page
   ============================================================ */
type ProviderRow = {
  id: string;
  name: string;
  displayName?: string;
  enabled: boolean;
  apiBaseUrl?: string;
  tagNames: string;
  modelsCount: number;
};

type ModelRow = {
  id: string;
  providerName: string;
  name: string;
  displayName?: string;
  apiEndpoint?: string;
  tagNames: string;
};

@Component({
  selector: 'app-provider-models-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TableGridComponent],
  template: `
  <section class="p-6 space-y-10">
    <!-- Providers -->
    <header class="mb-2 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Providers</h2>
      <div class="flex gap-2">
        <button class="btn btn-secondary" (click)="refreshProviders(true)">↻ Refresh</button>
        <button class="btn btn-primary" (click)="createProvider()">Create Provider</button>
      </div>
    </header>

    <app-table-grid
      [config]="providersGridConfig"
      [data]="providerRows()"
      [loading]="loadingProviders()"
      [page]="providersPage()"
      [pageSize]="providersPageSize()"
      [total]="providerRows().length"
      (refresh)="refreshProviders(true)"
      (pageRequest)="onProvidersPageRequest($event)"
    ></app-table-grid>

    <!-- Models -->
    <header class="mt-8 mb-2 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Provider Models</h2>
      <div class="flex gap-2">
        <button class="btn btn-secondary" (click)="refreshModels(true)">↻ Refresh</button>
        <button class="btn btn-primary" (click)="createModel()">Create Model</button>
      </div>
    </header>

    <app-table-grid
      [config]="modelsGridConfig"
      [data]="modelRows()"
      [loading]="loadingModels()"
      [page]="modelsPage()"
      [pageSize]="modelsPageSize()"
      [total]="modelRows().length"
      (refresh)="refreshModels(true)"
      (pageRequest)="onModelsPageRequest($event)"
    ></app-table-grid>
  </section>
  `
})
export class ProviderModelsAdminPageComponent {
  private readonly providersApi = inject(ProvidersService);
  private readonly modelsApi = inject(ProviderModelConfigsService);
  private readonly modal = inject(ModalService);
  private readonly chatPrefs = inject(ChatPrefsStateService);

  // ===== Request gates / throttles =====
  private static readonly MIN_REFRESH_MS = 1500;
  private providersReqInFlight = signal(false);
  private modelsReqInFlight = signal(false);
  private providersLastFetchAt = signal(0);
  private modelsLastFetchAt = signal(0);

  private providers = signal<ProviderDto[]>([]);
  private models = signal<ProviderModelConfigDto[]>([]);
  private providersLoadedOnce = signal(false);
  private modelsLoadedOnce = signal(false);

  loadingProviders = signal(false);
  loadingModels = signal(false);

  private _providersPage = signal(1);
  private _providersPageSize = signal(20);
  private _modelsPage = signal(1);
  private _modelsPageSize = signal(20);

  providersPage = this._providersPage.asReadonly();
  providersPageSize = this._providersPageSize.asReadonly();
  modelsPage = this._modelsPage.asReadonly();
  modelsPageSize = this._modelsPageSize.asReadonly();

  providerRows = signal<ProviderRow[]>([]);
  modelRows = signal<ModelRow[]>([]);

  // ===== Cached AI Generation tags from state (no network here) =====
  private readonly generationTags = computed(() => this.chatPrefs.generationTags());
  constructor() {
    // Ensure tags are loaded once (service handles cache/refresh; no spamming)
    this.chatPrefs.ensureGenerationTagsLoaded();

    // Initial loads (gated)
    this.refreshProviders(false);
    this.refreshModels(false);

    effect(() => {
      const source = this.providers();
      const rows: ProviderRow[] = source.map(p => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        enabled: !!p.enabled,
        apiBaseUrl: p.apiBaseUrl,
        tagNames: (p.supportedTagNames ?? []).join(', '),
        modelsCount: (p.models ?? []).length
      }));
      this.providerRows.set(rows);
    });

    effect(() => {
      const source = this.models();
      const rows: ModelRow[] = source.map(m => ({
        id: m.id,
        providerName: m.providerName,
        name: m.name,
        displayName: m.displayName,
        apiEndpoint: m.apiEndpoint,
        tagNames: (m.supportedTagNames ?? []).join(', ')
      }));
      this.modelRows.set(rows);
    });
  }

  onProvidersPageRequest(e: { page: number; pageSize: number }) {
    this._providersPage.set(e.page);
    this._providersPageSize.set(e.pageSize);
  }
  onModelsPageRequest(e: { page: number; pageSize: number }) {
    this._modelsPage.set(e.page);
    this._modelsPageSize.set(e.pageSize);
  }

  /* ---------------- Providers ---------------- */
  providersGridConfig: TableGridConfig<ProviderRow> = {
    showHeader: true,
    showFooter: true,
    showVerticalLines: false,
    showHorizontalLines: true,
    pageSizeOptions: [10, 20, 50, 100],

    columns: [
      { label: 'Name', field: 'name', width: '18rem', sortable: true },
      { label: 'Display Name', field: 'displayName', width: '18rem', sortable: true },
      { label: 'Enabled', field: 'enabled', width: '8rem', sortable: true, alignHorizontal: 'center' },
      { label: 'API Base URL', field: 'apiBaseUrl', width: '22rem', sortable: true },
      { label: 'Tags', field: 'tagNames', width: '18rem' },
      { label: 'Models', field: 'modelsCount', width: '8rem', alignHorizontal: 'right', sortable: true }
    ],

    actions: <TableGridAction<ProviderRow>>{
      label: 'Actions',             // can be UiContent: string | {html}| {component}
      width: '16rem',
      alignHorizontal: 'center',
      // sticky defaults to 'right' in the grid; set sticky: 'left' if you want left rail
      actions: [
        {
          // accessible name for screen readers / tooltip
          label: 'Edit',
          title: 'Edit provider',
          // optional button classes (kept from your prior style)
          colorClass: 'bg-primary text-primary-contrast hover:bg-primary/80',
          // the visual body rendered inside the button
          content: {
            component: { type: IconEditComponent, inputs: { size: 18 } }
          },
          callback: (row) => this.editProvider(row.id)
        },
        {
          label: 'Delete',
          title: 'Delete provider',
          colorClass: 'bg-error text-error-contrast hover:bg-error/80',
          content: {
            component: { type: IconDeleteComponent, inputs: { size: 18 } }
          },
          callback: (row) => this.deleteProvider(row.id)
        }
      ]
    }
  };

  modelsGridConfig: TableGridConfig<ModelRow> = {
    showHeader: true,
    showFooter: true,
    showVerticalLines: false,
    showHorizontalLines: true,
    pageSizeOptions: [10, 20, 50, 100],
    columns: [
      { label: 'Provider', field: 'providerName', width: '16rem', sortable: true },
      { label: 'Model Name', field: 'name', width: '18rem', sortable: true },
      { label: 'Display Name', field: 'displayName', width: '18rem', sortable: true },
      { label: 'API Endpoint', field: 'apiEndpoint', width: '24rem', sortable: true },
      { label: 'Tags', field: 'tagNames', width: '18rem' }
    ],
    actions: <TableGridAction>{
      label: 'Actions',
      width: '16rem',
      alignHorizontal: 'center',
      actions: [
        {
          label: 'Edit',
          colorClass: 'bg-primary text-primary-contrast hover:bg-primary/80',
          callback: (row) => this.editModel(row.id)
        },
        {
          label: 'Delete',
          colorClass: 'bg-error text-error-contrast hover:bg-error/80',
          callback: (row) => this.deleteModel(row.id)
        }
      ]
    }
  };

  refreshProviders(force = false) {
    const now = Date.now();
    if (!force) {
      // throttle & in-flight guard
      if (this.providersReqInFlight()) return;
      if (now - this.providersLastFetchAt() < ProviderModelsAdminPageComponent.MIN_REFRESH_MS) return;
    }
    this.providersReqInFlight.set(true);
    if (!this.providersLoadedOnce()) this.loadingProviders.set(true);

    this.providersApi.listProviders({})
      .pipe(finalize(() => {
        this.providersReqInFlight.set(false);
        this.providersLastFetchAt.set(Date.now());
        this.loadingProviders.set(false);
      }))
      .subscribe({
        next: res => {
          this.providers.set(res);
          this.providersLoadedOnce.set(true);
        },
        error: _ => { /* loading flag handled in finalize */ }
      });
  }

  createProvider() {
    const h = this.modal.open<ProviderFormComponent, any>(
      ProviderFormComponent,
      [{ provide: PROVIDER_FORM_DATA, useValue: { mode: 'create' as const } }],
      { title: 'Create Provider', hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingProviders.set(true);
      this.providersApi.createProvider({
        name: result.name,
        displayName: result.displayName || undefined,
        apiBaseUrl: result.apiBaseUrl || undefined,
        enabled: result.enabled
      }).subscribe({
        next: _ => this.refreshProviders(true),
        error: _ => this.loadingProviders.set(false)
      });
    });
  }

  editProvider(id: string) {
    const current = this.providers().find(p => p.id === id);
    if (!current) return;

    const h = this.modal.open<ProviderFormComponent, any>(
      ProviderFormComponent,
      [{ provide: PROVIDER_FORM_DATA, useValue: { mode: 'edit' as const, initial: current } }],
      { title: `Edit Provider: ${current.name}`, hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingProviders.set(true);
      this.providersApi.updateProvider({
        id,
        displayName: result.displayName ?? undefined,
        apiBaseUrl: result.apiBaseUrl ?? undefined,
        enabled: result.enabled
      }).subscribe({
        next: _ => this.refreshProviders(true),
        error: _ => this.loadingProviders.set(false)
      });
    });
  }

  deleteProvider(id: string) {
    const current = this.providers().find(p => p.id === id);
    const label = current ? current.name : 'this provider';
    this.modal.confirm(
      `Delete ${label}?`,
      'Confirm Delete',
      'Delete',
      'Cancel',
      'px-4 py-2 rounded-full bg-highlight text-highlight-contrast',
      'px-4 py-2 rounded-full bg-secondary text-secondary-contrast'
    ).subscribe(ok => {
      if (!ok) return;
      this.loadingProviders.set(true);
      this.providersApi.deleteProvider(id)
        .subscribe({
          next: _ => this.refreshProviders(true),
          error: _ => this.loadingProviders.set(false)
        });
    });
  }

  /* ---------------- Models ---------------- */
  refreshModels(force = false) {
    const now = Date.now();
    if (!force) {
      if (this.modelsReqInFlight()) return;
      if (now - this.modelsLastFetchAt() < ProviderModelsAdminPageComponent.MIN_REFRESH_MS) return;
    }
    this.modelsReqInFlight.set(true);
    if (!this.modelsLoadedOnce()) this.loadingModels.set(true);

    this.modelsApi.listModels({})
      .pipe(finalize(() => {
        this.modelsReqInFlight.set(false);
        this.modelsLastFetchAt.set(Date.now());
        this.loadingModels.set(false);
      }))
      .subscribe({
        next: res => {
          this.models.set(res);
          this.modelsLoadedOnce.set(true);
        },
        error: _ => { /* loading handled in finalize */ }
      });
  }

  createModel() {
    // Build lightweight list for the dropdown
    const providersMini = this.providers().map(p => ({ name: p.name, displayName: p.displayName }));
    // Pass cached AI Generation tags (no network)
    const genTags = this.generationTags();

    const h = this.modal.open<ProviderModelFormComponent, any>(
      ProviderModelFormComponent,
      [{
        provide: MODEL_FORM_DATA,
        useValue: { mode: 'create' as const, providers: providersMini, generationTags: genTags }
      }],
      { title: 'Create Provider Model', hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingModels.set(true);
      this.modelsApi.createModel({
        providerName: result.providerName,
        name: result.name,
        displayName: result.displayName || undefined,
        apiEndpoint: result.apiEndpoint || undefined,
        supportedTagNames: result.supportedTagNames ?? [] // include tags on create
      }).subscribe({
        next: _ => this.refreshModels(true),
        error: _ => this.loadingModels.set(false)
      });
    });
  }

  editModel(id: string) {
    const current = this.models().find(m => m.id === id);
    if (!current) return;

    const genTags = this.generationTags();
    const h = this.modal.open<ProviderModelFormComponent, any>(
      ProviderModelFormComponent,
      [{
        provide: MODEL_FORM_DATA,
        useValue: { mode: 'edit' as const, initial: current, generationTags: genTags }
      }],
      { title: `Edit Model: ${current.name}`, hideFooter: true }
    );

    h.afterClosed$.subscribe(result => {
      if (!result) return;
      this.loadingModels.set(true);
      this.modelsApi.updateModel({
        id,
        displayName: result.displayName ?? undefined,
        apiEndpoint: result.apiEndpoint ?? undefined,
        supportedTagNames: result.supportedTagNames ?? current.supportedTagNames ?? [] // allow clear/update
      }).subscribe({
        next: _ => this.refreshModels(true),
        error: _ => this.loadingModels.set(false)
      });
    });
  }

  deleteModel(id: string) {
    const current = this.models().find(m => m.id === id);
    const label = current ? `${current.providerName}/${current.name}` : 'this model';
    this.modal.confirm(
      `Delete ${label}?`,
      'Confirm Delete',
      'Delete',
      'Cancel',
      'px-4 py-2 rounded-full bg-highlight text-highlight-contrast',
      'px-4 py-2 rounded-full bg-secondary text-secondary-contrast'
    ).subscribe(ok => {
      if (!ok) return;
      this.loadingModels.set(true);
      this.modelsApi.deleteModel(id)
        .subscribe({
          next: _ => this.refreshModels(true),
          error: _ => this.loadingModels.set(false)
        });
    });
  }
}
