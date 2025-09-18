export interface Theme {
  name: string;
  // atomic palette you edit in the modal
  colors: Record<string, string>;      // e.g., { "brand": "#7c3aed", "danger": "#ef4444" }
  // semantic tokens used by components
  tokens?: Record<string, string>;     // e.g., { "text.primary": "brand", "surface.card": "#ffffff" }
}

export const THEME_KEYS: string[] = [
  'dark',
  'light',
  
  'background',
  'background-text',
  'foreground',
  'foreground-text',

  'primary',
  'secondary',
  'tertiary',
  'accent',
  'support',
  'neutral',

  'success',
  'success-contrast',

  'warning',
  'warning-contrast',

  'error',
  'error-contrast',

  'info',
  'info-contrast',

  'scrollbar-track',
  'scrollbar-thumb'
];