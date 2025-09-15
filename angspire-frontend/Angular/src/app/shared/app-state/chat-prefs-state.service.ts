// state/chat-prefs-state.service.ts
import { Injectable, inject, computed, signal, DestroyRef } from '@angular/core';
import { LocalStorageService } from '../../lib/modules/local-storage/localStorage.service';
import { StateService } from './state.service.base';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TagDto } from '../../modules/identity/tags/dtos/tag-dtos';
import { TagsService } from '../../modules/identity/tags/services/tags.service';

export interface ChatPrefsState {
  providerName: string | null;
  modelName: string | null;
  streamPreferred?: boolean;
  temperature?: number | null;
  maxTokens?: number | null;
  systemPrompt?: string | null;
  reasoningOpenTag?: string | null;
  reasoningClosingTag?: string | null;
}

const DEFAULT_CHAT_PREFS: ChatPrefsState = {
  providerName: null,
  modelName: null,
  streamPreferred: true,
  temperature: null,
  maxTokens: null,
  systemPrompt: null,
  reasoningOpenTag: null,
  reasoningClosingTag: null,
};

type TagsCache = { at: number; tags: TagDto[] };
const TAGS_CACHE_KEY = 'app.chat.generationTags.cache';
const TAGS_CACHE_TTL_MS = 10 * 60 * 1000; // 10m

@Injectable({ providedIn: 'root' })
export class ChatPrefsStateService extends StateService<ChatPrefsState> {
  private readonly ls = inject(LocalStorageService);
  private readonly tags = inject(TagsService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    super(
      inject(LocalStorageService),
      'app.chat.state',
      DEFAULT_CHAT_PREFS,
      {
        cleanupLegacy: true,
        legacy: [
          { key: 'app.llm.provider', map: v => (v ? { providerName: String(v) } : null) },
          { key: 'app.llm.model',    map: v => (v ? { modelName: String(v) }   : null) },
        ],
      }
    );

    this.hydrateTagsFromCache();
    this.refreshGenerationTags(false);
  }

  // ---------- prefs ----------
  setProvider(providerName: string | null, resetModel = true) {
    const patch: Partial<ChatPrefsState> = { providerName };
    if (resetModel) patch.modelName = null;
    this.patch(patch);
  }
  setModel(modelName: string | null) { this.patch({ modelName }); }
  setSelection(providerName: string | null, modelName: string | null) { this.patch({ providerName, modelName }); }
  setParams(p: Partial<Omit<ChatPrefsState, 'providerName' | 'modelName'>>) { this.patch(p); }
  clearSelection() { this.patch({ providerName: null, modelName: null }); }

  readonly llmSelection = computed(() => {
    const s = this.state();
    return { provider: s.providerName, model: s.modelName };
  });

  // ---------- AI Generation tags ----------
  readonly generationTags = signal<TagDto[]>([]);
  readonly generationTagsLoading = signal<boolean>(false);
  readonly generationTagsError = signal<string | null>(null);

  // Map by id
  readonly generationTagsById = computed<Record<string, TagDto>>(() => {
    const out: Record<string, TagDto> = {};
    for (const t of this.generationTags()) out[t.id] = t;
    return out;
  });

  // Map by displayName (lowercased for stable lookup)
  readonly generationTagsByDisplayName = computed<Record<string, TagDto>>(() => {
    const out: Record<string, TagDto> = {};
    for (const t of this.generationTags()) out[t.displayName.toLowerCase()] = t;
    return out;
  });

  getChildGenerationTags = (parentTagId: string) =>
    this.generationTags().filter(t => t.parentTagId === parentTagId);

  refreshGenerationTags(writeCache: boolean = true) {
    if (this.generationTagsLoading()) return;

    this.generationTagsLoading.set(true);
    this.generationTagsError.set(null);

    // Use valid sort key 'displayName'
    this.tags
      .listGenerationTags('displayName', 'asc')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tags => {
          const list = tags ?? [];
          this.generationTags.set(list);
          if (writeCache) this.writeTagsCache(list);
          this.generationTagsLoading.set(false);
        },
        error: err => {
          this.generationTagsError.set(err?.message ?? 'Failed to load AI Generation tags');
          this.generationTagsLoading.set(false);
        },
      });
  }

  ensureGenerationTagsLoaded() {
    if (!this.generationTagsLoading() && this.generationTags().length === 0) {
      this.refreshGenerationTags();
    }
  }

  // ---------- cache ----------
  private hydrateTagsFromCache() {
    try {
      const cache = this.ls.get<TagsCache | null>(TAGS_CACHE_KEY);
      if (!cache) return;
      const fresh = Date.now() - cache.at < TAGS_CACHE_TTL_MS;
      if (fresh && Array.isArray(cache.tags)) this.generationTags.set(cache.tags);
    } catch { /* ignore */ }
  }

  private writeTagsCache(tags: TagDto[]) {
    try {
      const cache: TagsCache = { at: Date.now(), tags };
      this.ls.set(TAGS_CACHE_KEY, cache);
    } catch { /* ignore */ }
  }
}
