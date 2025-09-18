// toggle.service.ts
import { Injectable, signal, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { LocalStorageService } from '../local-storage/localStorage.service';

export interface IToggleable {
  id: string;
  isToggled: boolean;
  toggle: () => void;
  groupIds?: string[]; // Optional group identifiers
}

export interface ToggleState {
  isToggled: boolean;
  lastToggled?: Date;
}

export interface ToggleEvent {
  id: string;
  groupIds?: string[];
  state: boolean;
  source: 'user' | 'programmatic' | 'persistence';
}

@Injectable({ providedIn: 'root' })
export class ToggleService {
  private readonly toggleables = new Map<string, IToggleable>();
  private readonly toggleStates = new Map<string, ToggleState>();
  private readonly activeToggleableIds = signal<Set<string>>(new Set());
  private readonly toggleEvents = new Subject<ToggleEvent>();
  public readonly toggleEvents$ = this.toggleEvents.asObservable();

  constructor(private localStorage: LocalStorageService) {
    // Restore persisted states
    this.restorePersistedStates();

    // Auto-persistence effect
    effect(() => {
      const ids = Array.from(this.activeToggleableIds());
      this.persistStates(ids);
    });
  }

  // -----------------------------------------------------------------
  // Core Registration Methods
  // -----------------------------------------------------------------
  register(toggleable: IToggleable): void {
    this.toggleables.set(toggleable.id, toggleable);
    this.restoreState(toggleable.id);
  }

  unregister(id: string): void {
    this.toggleables.delete(id);
    this.toggleStates.delete(id);
    this.activeToggleableIds.update(ids => {
      ids.delete(id);
      return ids;
    });
  }

  // -----------------------------------------------------------------
  // Toggling Methods
  // -----------------------------------------------------------------
  toggle(id: string, source: 'user' | 'programmatic' = 'programmatic'): void {
    const toggleable = this.toggleables.get(id);
    if (!toggleable) return;

    toggleable.toggle();
    this.updateState(id, toggleable.isToggled, source);
  }

  toggleGroup(groupId: string, source: 'user' | 'programmatic' = 'programmatic'): void {
    Array.from(this.toggleables.values())
      .filter(t => t.groupIds?.includes(groupId))
      .forEach(t => this.toggle(t.id, source));
  }

  toggleAll(source: 'user' | 'programmatic' = 'programmatic'): void {
    Array.from(this.toggleables.keys()).forEach(id => this.toggle(id, source));
  }

  // -----------------------------------------------------------------
  // State Management
  // -----------------------------------------------------------------
  private updateState(id: string, isToggled: boolean, source: ToggleEvent['source']): void {
    const toggleable = this.toggleables.get(id);
    if (!toggleable) return;

    const newState: ToggleState = {
      isToggled,
      lastToggled: new Date()
    };

    this.toggleStates.set(id, newState);
    
    this.activeToggleableIds.update(ids => {
      isToggled ? ids.add(id) : ids.delete(id);
      return ids;
    });

    this.toggleEvents.next({
      id,
      groupIds: toggleable.groupIds,
      state: isToggled,
      source
    });

    //console.log(`ToggleService: ${id} toggled to ${isToggled} by ${source}`);
  }

  getState(id: string): ToggleState | undefined {
    return this.toggleStates.get(id);
  }

  // -----------------------------------------------------------------
  // Persistence Methods
  // -----------------------------------------------------------------
  private persistStates(ids: string[]): void {
    const statesToPersist: Record<string, ToggleState> = {};
    
    ids.forEach(id => {
      const state = this.toggleStates.get(id);
      if (state) statesToPersist[id] = state;
    });

    this.localStorage.set('toggle-states', statesToPersist);
  }

  private restorePersistedStates(): void {
    const persistedStates = this.localStorage.get<Record<string, ToggleState>>('toggle-states');
    if (!persistedStates) return;

    Object.entries(persistedStates).forEach(([id, state]) => {
      this.toggleStates.set(id, state as ToggleState);
      if ((state as ToggleState).isToggled) {
        this.activeToggleableIds.update(ids => ids.add(id));
      }
    });
  }

  private restoreState(id: string): void {
    const persistedState = this.toggleStates.get(id);
    if (persistedState) {
      const toggleable = this.toggleables.get(id);
      if (toggleable && toggleable.isToggled !== persistedState.isToggled) {
        toggleable.toggle();
        this.updateState(id, persistedState.isToggled, 'persistence');
      }
    }
  }

  // -----------------------------------------------------------------
  // Query Methods
  // -----------------------------------------------------------------
  isToggled(id: string): boolean {
    return this.toggleStates.get(id)?.isToggled ?? false;
  }

  getActiveIds(): ReadonlySet<string> {
    return this.activeToggleableIds();
  }

  getGroupIds(): string[] {
    const groupIds = new Set<string>();
    this.toggleables.forEach(t => {
      t.groupIds?.forEach(gid => groupIds.add(gid));
    });
    return Array.from(groupIds);
  }

  getToggleablesInGroup(groupId: string): IToggleable[] {
    return Array.from(this.toggleables.values())
      .filter(t => t.groupIds?.includes(groupId));
  }
}