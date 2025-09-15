// state/global-state.service.ts
import { Injectable, inject } from '@angular/core';
import { LocalStorageService } from '../../lib/modules/local-storage/localStorage.service';
import { StateService } from './state.service.base';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface GlobalState {
  theme: ThemeMode;
}

const DEFAULT_GLOBAL: GlobalState = { theme: 'system' };

@Injectable({ providedIn: 'root' })
export class GlobalStateService extends StateService<GlobalState> {
  constructor() {
    super(inject(LocalStorageService), 'app.global.state', DEFAULT_GLOBAL);
  }

  setTheme(theme: ThemeMode) { this.patch({ theme }); }
}
