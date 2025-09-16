import { Directive, HostBinding, HostListener, Input, computed, signal } from '@angular/core';
import { UiVariant, UiDensity, UiRadius } from './ui-shared';

@Directive({
  selector: '[uiPrimitive]',
  standalone: true,
})
export class UiPrimitiveDirective {
  /** Accept any CSS color: hex, rgb(), hsl(), var(--token), etc. */
  @Input() color: string = 'var(--color-primary)';
  /** Optional; if not set we auto-pick black/white by luminance. */
  @Input() contrastColor?: string;

  /** Visual variant */
  @Input() variantIdle: UiVariant = 'filled';
  @Input() variantHover: UiVariant = 'filled';

  /** State & ergonomics */
  @Input() disabled = false;
  @Input() underlineIdle = false;
  @Input() underlineHover = false;
  @Input() dense: UiDensity = 'md';
  @Input() rounded: UiRadius = 'full';

  private hovering = signal(false);

  /** ---- Styling helpers ---- */

  @HostBinding('style.--ui-color') get uiColor() { return this.color; }
  @HostBinding('style.--ui-contrast') get uiContrast() {
    return this.contrastColor ?? this.autoContrast(this.color);
  }

  /** Always reserve border space to avoid layout shift */
  @HostBinding('class') get hostClass() { return this.classes(); }

  private classes = computed(() => {
    const v = this.hovering() ? this.variantHover : this.variantIdle;

    const base = [
      'transition font-semibold w-full focus:outline-none',
      // Reserve space: always 1px border, default transparent
      'border border-[color:transparent]',
      this.disabled ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'cursor-pointer',
      this.sizeClass(this.dense),
      this.radiusClass(this.rounded),
      this.underlineClass(),
      (this.hovering() && !this.disabled) ? 'shadow-lg' : '',
    ];

    const variant = {
      filled: [
        'bg-[color:var(--ui-color)]',
        'text-[color:var(--ui-contrast)]',
        // keep border transparent for stability
      ],
      outlined: [
        'bg-transparent',
        'text-[color:var(--ui-color)]',
        'border-[color:var(--ui-color)]',
      ],
      text: [
        'bg-transparent',
        'text-[color:var(--ui-color)]',
        // border stays transparent
      ],
      ringed: [
        'bg-transparent',
        'text-[color:var(--ui-color)]',
        'ring-2 ring-[color:var(--ui-color)]',
        'focus-visible:ring-4',
      ],
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

  /** Simple luminance-based contrast (hex/rgb/hsl/var-safe best-effort) */
  private autoContrast(c: string): string {
    // Best-effort: if it's a CSS var or unknown format, default to white.
    if (c.includes('var(')) return '#fff';
    try {
      const rgb = this.parseColorToRgb(c);
      const lum = (0.2126 * this.srgb(rgb.r) + 0.7152 * this.srgb(rgb.g) + 0.0722 * this.srgb(rgb.b));
      return lum > 0.5 ? '#000' : '#fff';
    } catch { return '#fff'; }
  }
  private srgb(v: number) { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
  private parseColorToRgb(c: string) {
    // hex #rgb/#rrggbb
    if (c.startsWith('#')) {
      const h = c.slice(1);
      const n = h.length === 3
        ? h.split('').map(x => parseInt(x + x, 16))
        : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
      return { r: n[0], g: n[1], b: n[2] };
    }
    // rgb(a)
    const rgbm = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (rgbm) return { r: +rgbm[1], g: +rgbm[2], b: +rgbm[3] };
    // naive fallback
    throw new Error('Unsupported color format');
  }
}
