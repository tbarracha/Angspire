// app-state-interfaces.ts
import type { JwtUserIdentityDto } from '../../modules/authentication/models/jwt-identity-dto';

export type DashboardSection = 'home' | 'iam' | 'theme' | 'docs';

export interface DashboardState {
  isPrimarySidebarCollapsed: boolean;
  isSecondarySidebarCollapsed: boolean;
  currentSection: DashboardSection;
}

/** Chat-related app settings and preferences (UI-level, not per-session). */
export interface ChatState {
  providerName: string | null;  // e.g., "Ollama" | "OpenRouter" | "OpenAI"
  modelName: string | null;     // e.g., "qwen3:14b"

  // Optional knobs (extend as needed)
  streamPreferred?: boolean;    // UI preference for streaming
  temperature?: number | null;
  maxTokens?: number | null;
  systemPrompt?: string | null;

  // Optional reasoning tags (if your provider uses them)
  reasoningOpenTag?: string | null;
  reasoningClosingTag?: string | null;
}

export interface AppState {
  dashboard: DashboardState;
  currentUser: JwtUserIdentityDto | null;
  selectedTeamId: string | null;
  workspaceViewMode?: 'grid' | 'list';
  chat: ChatState;
}

/** Default initial state */
export const DEFAULT_APP_STATE: AppState = {
  dashboard: {
    isPrimarySidebarCollapsed: true,
    isSecondarySidebarCollapsed: false,
    currentSection: 'home',
  },
  currentUser: null,
  selectedTeamId: null,
  workspaceViewMode: 'grid',
  chat: {
    providerName: null,
    modelName: null,
    streamPreferred: true,
    temperature: null,
    maxTokens: null,
    systemPrompt: null,
    reasoningOpenTag: null,
    reasoningClosingTag: null,
  },
};
