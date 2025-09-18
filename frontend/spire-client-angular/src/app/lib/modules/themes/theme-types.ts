// theme-types.ts
export type ColorRef = string | null | undefined;
export type CssSize = string | number | null | undefined;

export type UiRadiusKey = 'none'|'sm'|'md'|'lg'|'xl'|'2xl'|'full';
export type EdgeKey = 'all'|'x'|'y'|'top'|'right'|'bottom'|'left';
export type StateKey =
  | 'idle' | 'hover' | 'focus' | 'active'
  | 'disabled' | 'selected' | 'ariaCurrent' | 'ariaExpanded';

export interface UiColors {
  text?: ColorRef;
  bg?: ColorRef;
  border?: { color?: ColorRef };
  outline?: { color?: ColorRef };
  caret?: ColorRef;
  placeholder?: ColorRef;
  selection?: { bg?: ColorRef; text?: ColorRef };
}

export interface UiCorners { radius?: UiRadiusKey | CssSize; }

export interface UiBorder {
  width?: Partial<Record<EdgeKey, CssSize>> | CssSize;
  style?: 'solid'|'dashed'|'dotted'|'none';
  color?: ColorRef;
}

export interface UiOutline { width?: CssSize; offset?: CssSize; color?: ColorRef; }

export interface UiSpacing {
  padding?: Partial<Record<EdgeKey, CssSize>> | CssSize;
  margin?: Partial<Record<EdgeKey, CssSize>> | CssSize;
  gap?: CssSize;
  size?: { w?: CssSize; h?: CssSize; minW?: CssSize; minH?: CssSize; maxW?: CssSize; maxH?: CssSize };
}

export interface UiTypography {
  font?: { family?: string };
  fontSize?: CssSize;
  fontWeight?: string|number;
  lineHeight?: CssSize;
  letterSpacing?: CssSize;
  textTransform?: 'none'|'uppercase'|'lowercase'|'capitalize';
  textAlign?: 'left'|'center'|'right'|'justify';
  whiteSpace?: string;
  wordBreak?: string;
  hyphens?: string;
}

export interface UiEffects {
  shadow?: 'none'|'sm'|'md'|'lg'|'xl'|string;
  backdropBlur?: string;
  blur?: string;
  brightness?: string;
  contrast?: string;
  grayscale?: string;
  opacity?: number;
}

export interface UiInteractions {
  transition?: { properties?: string[]; duration?: number; timing?: string };
  cursor?: string;
  pointerEvents?: 'auto'|'none';
}

export interface UiStyle {
  colors?: UiColors;
  corners?: UiCorners;
  border?: UiBorder;
  outline?: UiOutline;
  spacing?: UiSpacing;
  typography?: UiTypography;
  effects?: UiEffects;
  interactions?: UiInteractions;
}

export type PartialUiStyle = Partial<UiStyle>;

export const UI_BASE_IDLE: UiStyle = {
  colors: {},
  corners: { radius: 'md' },
  border: { width: 0, style: 'solid' },
  outline: { width: 0, offset: 2 },
  spacing: {},
  typography: {},
  effects: { shadow: 'none', opacity: 1 },
  interactions: {
    transition: {
      properties: ['color','background-color','border-color','outline-color','box-shadow'],
      duration: 150,
      timing: 'ease'
    }
  },
};

// utils
export function deepClone<T>(x: T): T { return x ? JSON.parse(JSON.stringify(x)) as T : x; }
export function isObj(x: any) { return !!x && typeof x === 'object' && !Array.isArray(x); }
export function deepMerge<T extends object>(t: T, s?: any): T {
  if (!s) return t;
  for (const k of Object.keys(s)) {
    const v = (s as any)[k];
    if (isObj(v)) {
      if (!isObj((t as any)[k])) (t as any)[k] = {};
      deepMerge((t as any)[k], v);
    } else { (t as any)[k] = v; }
  }
  return t;
}
