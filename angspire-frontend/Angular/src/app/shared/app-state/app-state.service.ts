// state/app-state.service.ts
import { Injectable, inject, computed } from '@angular/core';
import { AuthStateService } from './auth-state.service';
import { ChatPrefsStateService } from './chat-prefs-state.service';
import { GlobalStateService } from './global-state.service';
import { DashboardStateService } from './dashboard-state.service';
import { AuthService } from '../../modules/authentication/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly authState = inject(AuthStateService);
  private readonly authApi   = inject(AuthService);
  private readonly dash      = inject(DashboardStateService);
  private readonly chat      = inject(ChatPrefsStateService);
  private readonly global    = inject(GlobalStateService);

  // ------------ selectors ------------
  readonly currentUser     = this.authState.user;
  readonly isAuthenticated = this.authState.isAuthenticated;

  /** Read-only accessors based on AuthState’s read helpers */
  get accessToken(): string | null {
    return this.authState.getAccessToken();
  }
  get bearerHeader(): Record<string, string> {
    return this.authState.bearerHeader;
  }

  // dashboard slice
  readonly dashboard = this.dash.state;

  // chat prefs slice
  readonly chatPrefs = this.chat.state;

  // global slice
  readonly globalState = this.global.state;

  readonly llmSelection = computed(() => {
    const p = this.chatPrefs();
    return { provider: p.providerName, model: p.modelName };
  });

  readonly chatSessionParams = computed(() => {
    const chat = this.chatPrefs();
    return {
      providerName: chat.providerName,
      modelName: chat.modelName,
      streamPreferred: chat.streamPreferred ?? true,
      temperature: chat.temperature,
      maxTokens: chat.maxTokens,
      systemPrompt: chat.systemPrompt,
      reasoningOpenTag: chat.reasoningOpenTag,
      reasoningClosingTag: chat.reasoningClosingTag,
    };
  });

  // ------------ forwarders ------------

  setDashboardSection   = this.dash.setSection.bind(this.dash);
  togglePrimarySidebar  = this.dash.togglePrimarySidebar.bind(this.dash);
  toggleSecondarySidebar= this.dash.toggleSecondarySidebar.bind(this.dash);

  setChatSelection(providerName: string | null, modelName: string | null) {
    this.chat.setSelection(providerName, modelName);
  }
  setChatProvider(providerName: string | null, resetModel = true) { this.chat.setProvider(providerName, resetModel); }
  setChatModel(modelName: string | null) { this.chat.setModel(modelName); }
  setChatParams(p: Parameters<typeof this.chat.setParams>[0]) { this.chat.setParams(p); }
  clearChatSelection() { this.chat.clearSelection(); }

  setTheme = this.global.setTheme.bind(this.global);

  // ------------ auth actions ------------
  // No refresh here; AuthState is a data container. If you need refresh, call AuthService directly elsewhere.
  logout() {
    this.authApi.logout(); // AuthStateService will react to onUserLogout, clear user, and navigate.
  }

  // ------------ reset all ------------
  resetAll() {
    this.authState.reset();   // clears only the in-memory user slice
    this.dash.reset();
    this.chat.reset();
    this.global.reset();
  }
}
