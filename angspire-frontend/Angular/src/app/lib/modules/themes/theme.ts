export interface Theme {
  name: string;
  colors: { [key: string]: string };
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