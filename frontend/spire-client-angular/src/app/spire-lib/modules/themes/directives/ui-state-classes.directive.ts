// ui-state-classes.directive.ts
import {
  Directive, ElementRef, HostBinding, HostListener,
  Input, OnInit, OnDestroy, computed, effect, inject, signal
} from '@angular/core';
import { Style } from '../theme';
import { ThemeService } from '../theme.service';

type StateKey = 'idle'|'hovered'|'active'|'focused'|'disabled';

@Directive({
  selector: '[uiStates]',
  standalone: true,
})
export class UiStateClassesDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private theme = inject(ThemeService);

  // ===== Base usage: compose classes per state =====
  /** Static classes from template's class="..." are preserved automatically. */
  @Input('hovered') hoveredClasses: string | null = null;
  @Input('active')  activeClasses: string | null = null;
  @Input('focused') focusedClasses: string | null = null;
  @Input('disabled') disabledClasses: string | null = null;

  /** Optional external state overrides */
  @Input() isHovered: boolean | null = null;
  @Input() isActive:  boolean | null = null;
  @Input() isFocused: boolean | null = null;
  @Input() isDisabled:boolean | null = null;

  // ===== Optional: theme-aware style system =====
  @Input() styleVariant: Style | null = null;     // 'solid' | 'soft' | 'outline' | 'dashed' | 'ghost'
  @Input() styleColor: string | null = null;       // token or literal (e.g., 'primary', '#f00')
  @Input() radiusToken: string | number | null = null;
  @Input() ringWidthToken: string | number | null = null;

  // Internal runtime state (auto if overrides not provided)
  private _hov = signal(false);
  private _act = signal(false);
  private _foc = signal(false);
  private _dis = signal(false);

  // Preserve initial static classes
  private initialClass = '';

  // Host class binding
  @HostBinding('class') hostClass = '';

  // Host style CSS variables once resolved (guarded)
  @HostBinding('style.--ui-bg')       bgVar: string | null = null;
  @HostBinding('style.--ui-fg')       fgVar: string | null = null;
  @HostBinding('style.--ui-border')   borderVar: string | null = null;
  @HostBinding('style.--ui-ring')     ringVar: string | null = null;
  @HostBinding('style.--ui-shadow')   shadowVar: string | null = null;
  @HostBinding('style.--ui-radius')   radiusVar: string | null = null;
  @HostBinding('style.--ui-ring-w')   ringWVar: string | null = null;

  // Debug / targeting
  @HostBinding('attr.data-style') get dataStyle() { return this.styleVariant ?? undefined; }

  ngOnInit() {
    this.initialClass = this.el.nativeElement.className ?? '';

    // Recompute any time theme animation ticks, inputs, or internal states change
    effect(() => {
      // pick effective booleans (external override wins)
      const hovered = this.isHovered ?? this._hov();
      const active  = this.isActive  ?? this._act();
      const focused = this.isFocused ?? this._foc();
      const disabled= this.isDisabled?? this._dis();

      // Compose classes
      const states: Array<[boolean, string | null]> = [
        [hovered, this.hoveredClasses],
        [active,  this.activeClasses],
        [focused, this.focusedClasses],
        [disabled,this.disabledClasses],
      ];
      const extra = states.filter(([on, cls]) => on && !!cls).map(([, cls]) => cls!.trim()).join(' ').trim();

      // Theme-derived CSS vars (optional)
      this.applyStyleVars(hovered, active, focused, disabled);

      // Final merged class list
      this.hostClass = [this.initialClass, extra].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

      // Touch the theme animation tick so lerps trigger recompute
      void this.theme.animationTick();
    });
  }

  ngOnDestroy() {
    // nothing to teardown (listeners are on host)
  }

  // ===== Host listeners to auto-drive states when not externally bound
  @HostListener('mouseenter') onEnter() { if (this.isHovered == null) this._hov.set(true); }
  @HostListener('mouseleave') onLeave() { if (this.isHovered == null) { this._hov.set(false); this._act.set(false); } }
  @HostListener('mousedown')  onDown()  { if (this.isActive  == null) this._act.set(true); }
  @HostListener('mouseup')    onUp()    { if (this.isActive  == null) this._act.set(false); }
  @HostListener('focusin')    onFocus() { if (this.isFocused == null) this._foc.set(true); }
  @HostListener('focusout')   onBlur()  { if (this.isFocused == null) this._foc.set(false); }

  private applyStyleVars(hovered: boolean, active: boolean, focused: boolean, disabled: boolean) {
    if (!this.styleVariant || !this.styleColor) {
      // Let consumers use purely class-based approach
      this.clearStyleVars();
      // Still apply metrics if provided
      this.radiusVar = this.resolveMetric('radius', this.radiusToken);
      this.ringWVar  = this.resolveMetric('ringWidth', this.ringWidthToken);
      return;
    }

    // Resolve base colors
    const bg = this.theme.resolve(this.styleColor);
    const fg = this.theme.resolveAutoContrastFor(this.styleColor);
    const border = this.theme.resolve(`${this.styleColor}-content`) ?? fg;
    const ring = border;
    const shadow = border;

    // State tweaks (simple defaults; you can refine later)
    const scale = (hex: string | null, factor: number) => hex ? adjust(hex, factor) : null;
    const isOutline = this.styleVariant === 'outline' || this.styleVariant === 'dashed';
    const isGhost   = this.styleVariant === 'ghost';

    // Idle baseline
    let bgV   = isGhost ? 'transparent' : (this.styleVariant === 'soft' ? scale(bg, 0.85) : bg);
    let fgV   = fg;
    let bdrV  = isOutline ? (border ?? fg) : (isGhost ? 'transparent' : 'transparent');
    let ringV = 'transparent';
    let shV   = 'transparent';

    if (hovered) {
      bgV = isGhost ? scale(bg, 0.92) : scale(bgV, 0.95);
      ringV = 'transparent';
      shV = 'transparent';
    }
    if (active) {
      bgV = isGhost ? scale(bg, 0.88) : scale(bgV, 0.90);
    }
    if (focused) {
      ringV = border ?? fg ?? '';
    }
    if (disabled) {
      fgV = 'rgba(0,0,0,0.35)';
      bgV = isGhost ? 'transparent' : 'rgba(0,0,0,0.08)';
      bdrV = isOutline ? 'rgba(0,0,0,0.15)' : 'transparent';
      ringV = 'transparent';
      shV = 'transparent';
    }

    this.bgVar     = bgV;
    this.fgVar     = fgV;
    this.borderVar = bdrV;
    this.ringVar   = ringV;
    this.shadowVar = shV;

    // Metrics
    this.radiusVar = this.resolveMetric('radius', this.radiusToken);
    this.ringWVar  = this.resolveMetric('ringWidth', this.ringWidthToken);
  }

  private clearStyleVars() {
    this.bgVar = this.fgVar = this.borderVar = this.ringVar = this.shadowVar = null;
  }

  private resolveMetric(cat: 'radius'|'ringWidth', token: string | number | null) {
    return token == null ? null : (this.theme.resolveSize(cat, token) ?? null);
  }
}

/** tiny color adjust toward black/white; factor<1 darkens; >1 lightens */
function adjust(hexOrRgb: string, factor: number): string {
  const m = hexOrRgb.trim();
  const isHex = m.startsWith('#');
  const parseHex = (s: string) => {
    const h = s.slice(1);
    const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    const n = parseInt(full, 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  };
  const parseRgb = (s: string) => {
    const mm = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!mm) return [0,0,0];
    return [+mm[1], +mm[2], +mm[3]];
  };
  const [r,g,b] = isHex ? parseHex(m) : parseRgb(m);
  const lerp = (x:number) => Math.round(x*factor + (factor>1 ? (255 - x)*(factor-1) : 0));
  const rr = Math.min(255, Math.max(0, lerp(r)));
  const gg = Math.min(255, Math.max(0, lerp(g)));
  const bb = Math.min(255, Math.max(0, lerp(b)));
  return `rgb(${rr}, ${gg}, ${bb})`;
}
