import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonStyle = 'solid' | 'light' | 'outline' | 'dashed' | 'ghost';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="htmlType"
      [disabled]="disabled"
      [ngClass]="combinedClasses"
      [style.backgroundColor]="
        useTailwindClasses
          ? null
          : hovering
          ? hoverBackgroundColor || backgroundColor
          : backgroundColor
      "
      [style.color]="
        useTailwindClasses
          ? null
          : hovering
          ? hoverTextColor || textColor
          : textColor
      "
      [style.borderColor]="
        useTailwindClasses
          ? null
          : hovering
          ? hoverBorderColor || borderColor
          : borderColor
      "
      [style.borderStyle]="useTailwindClasses ? null : borderStyle"
      [style.borderWidth]="useTailwindClasses ? null : borderWidth"
      [style.boxShadow]="inlineBoxShadow"
      [class.underline]="underlineIdle || (underlineHover && hovering)"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() buildTailwindClasses = true;
  @Input() customClasses?: string | string[];

  @Input() variant: ButtonStyle = 'solid';

  private _variantSetExplicitly = false;

  @Input()
  set variantInput(v: ButtonStyle | undefined) {
    if (v !== undefined) {
      this.variant = v;
      this._variantSetExplicitly = true;
    }
  }

  @Input('style')
  set legacyStyle(v: string | undefined) {
    if (!v) return;
    const token = v.trim() as ButtonStyle;
    if (!this._variantSetExplicitly) {
      if (['solid', 'light', 'outline', 'dashed', 'ghost'].includes(token)) {
        this.variant = token;
      }
    }
  }

  @Input() mainColor: string = '#000000';
  @Input() contentColor: string = '#ffffff';

  @Input() hoverStyle?: ButtonStyle;
  @Input() hoverMainColor?: string | null;
  @Input() hoverContentColor?: string | null;

  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;

  @Input() underlineIdle = false;
  @Input() underlineHover = false;

  hovering = false;

  @HostListener('mouseenter') onHostEnter(): void {
    if (!this.disabled) this.hovering = true;
  }
  @HostListener('mouseleave') onHostLeave(): void {
    this.hovering = false;
  }

  private isOutlineLike(style: ButtonStyle): boolean {
    return style === 'outline' || style === 'dashed' || style === 'ghost';
  }

  private getEffectiveHoverContentToken(): string | null {
    const hoverStyle = this.hoverStyle ?? this.variant;
    const explicit = this.hoverContentColor;
    if (explicit && explicit.trim() !== '') return explicit.trim();
    if (this.isOutlineLike(hoverStyle)) {
      return this.hoverMainColor && this.hoverMainColor.trim() !== ''
        ? this.hoverMainColor.trim()
        : this.mainColor && this.mainColor.trim() !== ''
        ? this.mainColor.trim()
        : null;
    }
    return this.contentColor ?? null;
  }

  private isTailwindish(value: string | null | undefined): boolean {
    if (!value) return false;
    const v = value.trim();
    if (!v) return false;
    if (/^#/.test(v)) return false;
    if (/^(rgb|rgba|hsl|hsla)\(/.test(v)) return false;
    const tailwindPrefixes = [
      'bg-',
      'text-',
      'border-',
      'hover:',
      'focus:',
      'active:',
      'disabled:',
      'cursor-',
      'opacity-',
      'shadow-',
      'rounded-',
      'font-',
      'px-',
      'py-',
      'w-',
      'h-',
      'flex',
      'grid',
      'items-',
      'justify-',
      'underline',
      'hover',
    ];
    if (v.includes(' ') || v.includes(':')) return true;
    if (tailwindPrefixes.some((p) => v.startsWith(p))) return true;
    return true;
  }

  public buildTailwindClassesFromInputs(): {
    normal: string[];
    hover: string[];
  } {
    const normal: string[] = [];
    const hover: string[] = [];

    const base = [
      'transition',
      'font-semibold',
      'rounded-2xl',
      'w-full',
      'px-4',
      'py-2',
      'focus-visible:outline-none',
      'border-2',
      'ring',
    ];
    normal.push(...base);

    const normalStyle = this.variant;
    const hoverStyle = this.hoverStyle ?? this.variant;

    const resolveColorAsClasses = (
      tokenOrClass?: string | null,
      target: 'bg' | 'text' | 'border' | 'ring' = 'bg'
    ): string[] => {
      if (!tokenOrClass) return [];
      const v = tokenOrClass.trim();
      if (!v) return [];
      if (
        v.includes(' ') ||
        (v.includes('-') &&
          (v.startsWith('bg-') ||
            v.startsWith('text-') ||
            v.startsWith('border-') ||
            v.startsWith('ring-') ||
            v.startsWith('hover:') ||
            v.startsWith('focus:')))
      ) {
        return v
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      switch (target) {
        case 'bg':
          return [`bg-${v}`];
        case 'text':
          return [`text-${v}`];
        case 'border':
          return [`border-${v}`];
        case 'ring':
          return [`ring-${v}`];
        default:
          return [];
      }
    };

    const applyStyle = (
      out: string[],
      styleName: ButtonStyle,
      mainColorValue?: string | null,
      contentColorValue?: string | null
    ) => {
      const mainIsTailwind = this.isTailwindish(mainColorValue ?? undefined);
      const contentIsTailwind = this.isTailwindish(
        contentColorValue ?? undefined
      );

      const mainBg = resolveColorAsClasses(mainColorValue ?? undefined, 'bg');
      const mainBorder = resolveColorAsClasses(
        mainColorValue ?? undefined,
        'border'
      );
      const mainRing = resolveColorAsClasses(
        mainColorValue ?? undefined,
        'ring'
      );
      const contentText = resolveColorAsClasses(
        contentColorValue ?? undefined,
        'text'
      );

      if (styleName === 'dashed') out.push('border-dashed');
      else out.push('border-solid');

      switch (styleName) {
        case 'solid':
          out.push('border-transparent', 'ring-transparent');
          if (mainBg.length) out.push(...mainBg);
          if (contentText.length) out.push(...contentText);
          break;

        case 'light':
          out.push('border-transparent', 'ring-transparent');
          if (mainIsTailwind && mainColorValue) {
            out.push(`bg-${mainColorValue}-100`);
            out.push(`text-${contentColorValue ?? mainColorValue}`);
          } else {
            if (contentText.length) out.push(...contentText);
          }
          break;

        case 'outline':
          out.push('bg-transparent', 'ring-transparent');
          if (mainBorder.length) out.push(...mainBorder);
          else if (mainIsTailwind && mainColorValue)
            out.push(`border-${mainColorValue}`);
          if (mainIsTailwind && mainColorValue) {
            out.push(`text-${mainColorValue}`);
          } else if (contentText.length) {
            out.push(...contentText);
          }
          break;

        case 'dashed':
          out.push('bg-transparent', 'ring-transparent');
          if (mainBorder.length) out.push(...mainBorder);
          else if (mainIsTailwind && mainColorValue)
            out.push(`border-${mainColorValue}`);
          out.push('border-dashed');
          if (mainIsTailwind && mainColorValue) {
            out.push(`text-${mainColorValue}`);
          } else if (contentText.length) {
            out.push(...contentText);
          }
          break;

        case 'ghost':
          out.push('bg-transparent', 'ring-transparent');
          if (mainBorder.length) out.push(...mainBorder);
          else if (mainIsTailwind && mainColorValue)
            out.push(`border-${mainColorValue}`);
          if (mainIsTailwind && mainColorValue) {
            out.push(`text-${mainColorValue}`);
          } else if (contentText.length) {
            out.push(...contentText);
          }
          break;
      }
    };

    applyStyle(normal, normalStyle, this.mainColor, this.contentColor);

    const hoverMain = this.hoverMainColor ?? this.mainColor;
    const hoverContentToken = this.getEffectiveHoverContentToken();
    applyStyle(hover, hoverStyle as ButtonStyle, hoverMain, hoverContentToken);

    // NEW: decide whether hover colored border/ring should be applied
    const shouldApplyHoverBorderAndRing = (
      styleName: ButtonStyle,
      colorToken?: string | null
    ): boolean => {
      if (!colorToken) return false;
      // If hover style explicitly asks for outline/dashed (border), allow colored border.
      if (styleName === 'outline' || styleName === 'dashed') return true;
      // If hover style is solid and a hoverMainColor is provided, we may want a colored ring (outer highlight).
      if (styleName === 'solid' && this.hoverMainColor) return true;
      // For ghost and light, do not apply colored ring/border on hover by default.
      return false;
    };

    if (shouldApplyHoverBorderAndRing(hoverStyle, hoverMain)) {
      const ensureColoredBorderAndRing = (
        arr: string[],
        colorToken?: string | null
      ) => {
        if (!colorToken) return;
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] === 'border-transparent') arr.splice(i, 1);
          if (arr[i] === 'ring-transparent') arr.splice(i, 1);
        }
        const borderCls = resolveColorAsClasses(colorToken, 'border');
        if (borderCls.length) arr.push(...borderCls);
        else if (colorToken && !colorToken.includes('-'))
          arr.push(`border-${colorToken}`);
        const ringCls = resolveColorAsClasses(colorToken, 'ring');
        if (ringCls.length) arr.push(...ringCls);
        else if (colorToken && !colorToken.includes('-'))
          arr.push(`ring-${colorToken}`);
        if (!arr.some((a) => /^ring(-|$)/.test(a))) {
          arr.push('ring');
        }
      };
      ensureColoredBorderAndRing(hover, hoverMain);
    } else {
      // Ensure hover explicitly keeps ring/border transparent so no visual ring appears.
      // Remove any color classes and add transparent placeholders.
      for (let i = hover.length - 1; i >= 0; i--) {
        if (hover[i].startsWith('border-') && hover[i] !== 'border-dashed') {
          hover.splice(i, 1);
        }
        if (hover[i].startsWith('ring-')) {
          hover.splice(i, 1);
        }
      }
      hover.push('border-transparent', 'ring-transparent');
    }

    if (!this.disabled) hover.push('shadow-lg');

    if (this.disabled) {
      normal.push('opacity-60', 'pointer-events-none', 'cursor-not-allowed');
    } else {
      normal.push('cursor-pointer');
    }

    return {
      normal: Array.from(new Set(normal)).filter(Boolean),
      hover: Array.from(new Set(hover)).filter(Boolean),
    };
  }

  private isTailwindInUse(): boolean {
    if (!this.buildTailwindClasses && this.customClasses) return true;
    const anyTailwindish = [
      this.mainColor,
      this.contentColor,
      this.hoverMainColor,
      this.hoverContentColor,
    ].some((v) => this.isTailwindish(v));
    return anyTailwindish;
  }

  get useTailwindClasses(): boolean {
    return this.isTailwindInUse();
  }

  // Inline-style fallbacks
  get backgroundColor(): string | null {
    if (this.disabled) return '#cccccc';
    if (this.useTailwindClasses) return null;
    switch (this.variant) {
      case 'solid':
        return this.mainColor;
      case 'light':
        return this.lightenColor(this.mainColor, 0.3);
      case 'outline':
      case 'dashed':
      case 'ghost':
        return 'transparent';
      default:
        return this.mainColor;
    }
  }

  get textColor(): string | null {
    if (this.disabled) return '#666666';
    if (this.useTailwindClasses) return null;
    switch (this.variant) {
      case 'solid':
      case 'light':
        return this.contentColor;
      case 'outline':
      case 'dashed':
      case 'ghost':
        return this.mainColor;
      default:
        return this.contentColor;
    }
  }

  get hoverTextColor(): string | null {
    if (this.disabled) return null;
    if (this.useTailwindClasses) return null;
    const token = this.getEffectiveHoverContentToken();
    if (!token) return null;
    if (/^#/.test(token) || /^(rgb|rgba|hsl|hsla)\(/.test(token)) {
      return token;
    }
    return null;
  }

  get hoverBackgroundColor(): string | null {
    if (this.disabled) return null;
    if (this.useTailwindClasses) return null;
    return this.hoverMainColor ?? '';
  }

  get borderWidth(): string {
    return '2px';
  }

  get borderStyle(): string {
    return this.variant === 'dashed' ? 'dashed' : 'solid';
  }

  get borderColor(): string | null {
    if (this.disabled) return '#cccccc';
    if (this.useTailwindClasses) return null;
    switch (this.variant) {
      case 'outline':
      case 'dashed':
      case 'ghost':
        return this.mainColor;
      case 'solid':
      case 'light':
      default:
        return 'transparent';
    }
  }

  get hoverBorderColor(): string | null {
    if (this.disabled) return null;
    if (this.useTailwindClasses) return null;
    return this.hoverMainColor ?? this.mainColor;
  }

  get inlineBoxShadow(): string | null {
    if (this.useTailwindClasses) return null;
    if (!this.hovering || this.disabled) return null;
    const color = this.hoverBorderColor ?? this.mainColor;
    if (!color) return null;
    const rgba = this.hexToRgba(color, 0.18);
    // Only show inline box-shadow ring for hover styles that warrant it (solid/outline)
    const hoverStyle = this.hoverStyle ?? this.variant;
    if (!(hoverStyle === 'solid' || hoverStyle === 'outline')) return null;
    return `0 0 0 4px ${rgba}`;
  }

  private get interactiveClasses(): string[] {
    if (this.useTailwindClasses) return [];
    return this.hovering && !this.disabled ? ['shadow-lg'] : [];
  }

  get combinedClasses(): string[] {
    if (!this.buildTailwindClasses) {
      let baseClasses: string[] = [];
      if (this.customClasses) {
        baseClasses = Array.isArray(this.customClasses)
          ? this.customClasses
          : (this.customClasses as string).split(/\s+/).filter(Boolean);
      } else {
        baseClasses = [
          'transition',
          'font-semibold',
          'rounded-2xl',
          'w-full',
          'px-4',
          'py-2',
          'focus-visible:outline-none',
          'border-2',
          'ring-4',
          'ring-transparent',
          'border-transparent',
        ];
      }
      const merged = Array.from(
        new Set([...baseClasses, ...this.interactiveClasses])
      ).filter(Boolean);
      if (!this.useTailwindClasses && this.disabled) {
        merged.push('opacity-60', 'pointer-events-none', 'cursor-not-allowed');
      } else if (!this.useTailwindClasses && !this.disabled) {
        merged.push('cursor-pointer');
      }
      return merged;
    }

    const { normal, hover } = this.buildTailwindClassesFromInputs();

    if (!this.hovering) {
      return Array.from(
        new Set([...normal, ...this.interactiveClasses])
      ).filter(Boolean);
    }

    const colorPrefixesToRemove = ['bg-', 'text-', 'border-', 'ring-'];
    const numericSizeClasses = [
      'border-2',
      'border-4',
      'ring-2',
      'ring-4',
      'border',
      'ring',
    ];

    const normalFiltered = normal.filter((n) => {
      if (numericSizeClasses.includes(n)) return true;
      for (const p of colorPrefixesToRemove) {
        if (hover.some((h) => h.startsWith(p)) && n.startsWith(p)) {
          return false;
        }
      }
      return true;
    });

    const merged = Array.from(
      new Set([...normalFiltered, ...hover, ...this.interactiveClasses])
    ).filter(Boolean);
    return merged;
  }

  private lightenColor(color: string, amount: number): string {
    if (!color) return color;
    let usePound = false;
    let col = color;
    if (col[0] === '#') {
      col = col.slice(1);
      usePound = true;
    }
    if (![3, 6].includes(col.length)) {
      return (usePound ? '#' : '') + col;
    }
    if (col.length === 3) {
      col = col
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + Math.round(255 * amount);
    let g = ((num >> 8) & 0x00ff) + Math.round(255 * amount);
    let b = (num & 0x0000ff) + Math.round(255 * amount);
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return (
      (usePound ? '#' : '') +
      ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
    );
  }

  private hexToRgba(hex: string, alpha = 1): string {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let h = hex.replace('#', '');
    if (h.length === 3)
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    const num = parseInt(h, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}