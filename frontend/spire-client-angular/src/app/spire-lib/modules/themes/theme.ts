// theme.ts
export interface ThemeMetrics {
  /** e.g., { none:'0', sm:'0.125rem', md:'0.375rem', lg:'0.5rem', xl:'1rem', pill:'9999px' } */
  radius?: Record<string, string>;
  /** e.g., { none:'0', hairline:'1px', base:'2px', thick:'3px' } */
  borderWidth?: Record<string, string>;
  /** e.g., { none:'0', subtle:'1px', focus:'2px', strong:'3px' } */
  ringWidth?: Record<string, string>;
  // (Optional) add more families later: spacing, shadow, etc.
}

export interface Theme {
  name: string;
  colors: Record<string, string>;
  metrics?: ThemeMetrics;
}

export interface ColorPair {
  background?: string | null;   // background
  content?: string | null;      // foreground/outline/text
}

export type Style =
'solid'     // filled background with contrast text
| 'soft'    // lighter background with contrast text
| 'outline' // filled background with contrast border
| 'dashed'  // outlined with dashed border
| 'ghost';  // no bg, no border, just text/icon color

export type StateKey = 'idle'|'hovered'|'active'|'focused'|'disabled';