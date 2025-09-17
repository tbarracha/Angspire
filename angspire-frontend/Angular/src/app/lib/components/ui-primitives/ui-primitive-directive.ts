import { Directive, HostBinding, HostListener, Input, computed, signal } from '@angular/core';
import { UiVariant, UiDensity, UiRadius } from './ui-shared';

@Directive({
  selector: '[uiPrimitive]',
  standalone: true,
})
export class UiPrimitiveDirective {
  @Input() color: string = 'var(--color-primary)';
  @Input() contrastColor?: string;

  @Input() variantIdle: UiVariant = 'filled';
  @Input() variantHover: UiVariant = 'filled';

  @Input() disabled = false;
  @Input() underlineIdle = false;
  @Input() underlineHover = false;
  @Input() dense: UiDensity = 'md';
  @Input() rounded: UiRadius = 'full';

  /** NEW: placeholder color (inputs/textarea); Tailwind arbitrary value class uses this var */
  @Input() placeholderColor: string | null = '#9ca3af'; // gray-400 default

  private hovering = signal(false);

  @HostBinding('style.--ui-color') get uiColor() { return this.color; }
  @HostBinding('style.--ui-contrast') get uiContrast() {
    return this.contrastColor ?? this.autoContrast(this.color);
  }
  /** NEW: bind CSS var used by Tailwind arbitrary value class */
  @HostBinding('style.--ui-placeholder') get uiPlaceholder() {
    return this.placeholderColor ?? null;
  }

  /** Native/accessibility disabled */
  @HostBinding('attr.disabled') get hostDisabledAttr() { return this.disabled ? '' : null; }
  @HostBinding('attr.aria-disabled') get hostAriaDisabled() { return this.disabled ? 'true' : null; }

  @HostBinding('class') get hostClass() { return this.classes(); }

  private classes = computed(() => {
    const v = this.hovering() ? this.variantHover : this.variantIdle;

    const base = [
      // layout/interaction
      'transition w-full focus:outline-none',
      // reserve border space
      'border border-[color:transparent]',
      // focus ring for keyboard users
      'focus-visible:ring-2 focus-visible:ring-[color:var(--ui-color)] focus-visible:ring-offset-2',
      // NEW: placeholder color (works for inputs/textarea only; harmless elsewhere)
      'placeholder-[color:var(--ui-placeholder)] placeholder:opacity-100',
      this.disabled ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'cursor-pointer',
      this.sizeClass(this.dense),
      this.radiusClass(this.rounded),
      this.underlineClass(),
      (this.hovering() && !this.disabled) ? 'shadow-lg' : '',
    ];

    const variant = {
      filled:  ['bg-[color:var(--ui-color)]','text-[color:var(--ui-contrast)]'],
      outlined:['bg-white','text-[color:var(--ui-color)]','border-[color:var(--ui-color)]'],
      text:    ['bg-transparent','text-[color:var(--ui-color)]'],
      ringed:  ['bg-white','text-[color:var(--ui-color)]','ring-2 ring-[color:var(--ui-color)]','focus-visible:ring-4'],
    }[v];

    return [...base, ...variant].filter(Boolean).join(' ');
  });

  @HostListener('mouseenter') onEnter() { if (!this.disabled) this.hovering.set(true); }
  @HostListener('mouseleave') onLeave() { this.hovering.set(false); }

  private sizeClass(d: UiDensity) {
    return d === 'sm' ? 'px-3 py-1.5 text-sm'
         : d === 'lg' ? 'px-5 py-3 text-base'
         : 'px-4 py-2 text-sm';
  }
  private radiusClass(r: UiRadius) {
    return r === 'none' ? 'rounded-none'
         : r === 'md' ? 'rounded-md'
         : r === 'lg' ? 'rounded-2xl'
         : 'rounded-full';
  }
  private underlineClass() {
    if (this.disabled) return '';
    if (this.hovering() && this.underlineHover) return 'hover:underline';
    return this.underlineIdle ? 'underline' : '';
  }

  private autoContrast(c: string): string {
    if (c.includes('var(')) return '#fff';
    try {
      const rgb = this.parseColorToRgb(c);
      const lum = (0.2126 * this.srgb(rgb.r) + 0.7152 * this.srgb(rgb.g) + 0.0722 * this.srgb(rgb.b));
      return lum > 0.5 ? '#000' : '#fff';
    } catch { return '#fff'; }
  }
  private srgb(v: number) { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
  private parseColorToRgb(c: string) {
    if (c.startsWith('#')) {
      const h = c.slice(1);
      const n = h.length === 3
        ? h.split('').map(x => parseInt(x + x, 16))
        : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
      return { r: n[0], g: n[1], b: n[2] };
    }
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    throw new Error('Unsupported color format');
  }
}
