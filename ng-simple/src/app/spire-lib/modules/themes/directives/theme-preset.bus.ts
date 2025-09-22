// theme-preset.bus.ts
import { EventEmitter, Injectable } from '@angular/core';

export type StyleKind = 'solid' | 'soft' | 'outline' | 'dashed' | 'ghost';

export interface ColorPair {
  base?: string | null;    // background
  content?: string | null; // foreground/text
}

@Injectable()
export class ThemePresetBus {
  // Base style + metrics
  styleKind: StyleKind = 'outline';
  radius: string | number | null = null;

  hoverStyleKind: StyleKind | null = null;

  // Per-state color pairs
  base: ColorPair = {};
  hover: ColorPair = {};
  active: ColorPair = {};
  focus: ColorPair & { ring?: string | null } = {};
  disabled: ColorPair = {};

  changed = new EventEmitter<void>();

  setStyle(k: StyleKind) { this.styleKind = k; this.changed.emit(); }
  setRadius(r: string | number | null) { this.radius = r; this.changed.emit(); }

  setHoverStyle(k: StyleKind | null) { this.hoverStyleKind = k; this.changed.emit(); }

  setBase(bg?: string | null, fg?: string | null) { this.base = { base: bg, content: fg }; this.changed.emit(); }
  setHover(bg?: string | null, fg?: string | null) { this.hover = { base: bg, content: fg }; this.changed.emit(); }
  setActive(bg?: string | null, fg?: string | null) { this.active = { base: bg, content: fg }; this.changed.emit(); }
  setFocus(bg?: string | null, fg?: string | null, ring?: string | null) { this.focus = { base: bg, content: fg, ring }; this.changed.emit(); }
  setDisabled(bg?: string | null, fg?: string | null) { this.disabled = { base: bg, content: fg }; this.changed.emit(); }
}
