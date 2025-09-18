// theme.directive.ts
import {
    Directive, ElementRef, HostBinding, HostListener, Input,
    OnInit, OnDestroy, OnChanges, SimpleChanges, inject, signal
} from '@angular/core';
import { ThemeService } from './theme.service';
import {
    ColorRef, CssSize, StateKey, UiRadiusKey, EdgeKey,
    UiStyle, UI_BASE_IDLE, deepClone, deepMerge
} from './theme-types';

export type ThemeSpec = Partial<Record<StateKey, Partial<UiStyle>>> & {
    /** Shared props applied to ALL states (merged first) */
    base?: Partial<UiStyle>;
    /** Optional named presets merged into idle before state overrides */
    variants?: Record<string, Partial<UiStyle>>;
    /** Pick a variant */
    variant?: string | null;
};

@Directive({
    selector: '[uiTheme]',
    standalone: true,
})
export class UiThemeDirective implements OnInit, OnDestroy, OnChanges {
    private themeSvc = inject(ThemeService);
    private el = inject(ElementRef<HTMLElement>);

    /** Single, compact input: per-state UiStyle patches (+ optional variants) */
    @Input() theme?: ThemeSpec;

    /** State flags that influence resolution */
    @Input() disabled = false;
    @Input() selected = false;
    @Input() ariaCurrent?: any;
    @Input() ariaExpanded?: any;

    // Interaction signals
    private hovering = signal(false);
    private focusing = signal(false);
    private activing = signal(false);

    private themeTick = signal(0);
    private sub?: { unsubscribe?: () => void };

    /* Event wiring for programmatic states */
    @HostListener('mouseenter') onEnter() { if (!this.disabled) { this.hovering.set(true); this.apply(); } }
    @HostListener('mouseleave') onLeave() { this.hovering.set(false); this.apply(); }
    @HostListener('focusin') onFocusIn() { if (!this.disabled) { this.focusing.set(true); this.apply(); } }
    @HostListener('focusout') onFocusOut() { this.focusing.set(false); this.apply(); }
    @HostListener('mousedown') onDown() { if (!this.disabled) { this.activing.set(true); this.apply(); } }
    @HostListener('mouseup') onUp() { this.activing.set(false); this.apply(); }

    /* ARIA/disabled host bindings */
    @HostBinding('attr.disabled') get hostDisabledAttr() { return this.disabled ? '' : null; }
    @HostBinding('attr.aria-disabled') get hostAriaDisabled() { return this.disabled ? 'true' : null; }
    @HostBinding('attr.aria-selected') get hostAriaSelected() { return this.selected ? 'true' : null; }
    @HostBinding('attr.aria-current') get hostAriaCurrent() { return this.ariaCurrent ? 'true' : null; }
    @HostBinding('attr.aria-expanded') get hostAriaExpanded() { return this.ariaExpanded ? 'true' : null; }

    ngOnInit() {
        this.sub = (ThemeService as any).themeChanged?.subscribe?.(() => {
            this.themeTick.update(n => n + 1);
            this.apply();
        });
        queueMicrotask(() => this.apply());
    }
    ngOnDestroy() { try { this.sub?.unsubscribe?.(); } catch { } }
    ngOnChanges(_: SimpleChanges) { this.apply(); }

    /* ===================== MAIN ===================== */
    private apply() {
        void this.themeTick();

        const spec = deepClone(this.theme ?? {});

        // 1) Apply base → idle → states (disabled > active > focus > hover > selected > aria*)
        const eff: UiStyle = deepClone(UI_BASE_IDLE);

        // base (applies to every state unless overridden)
        if (spec.base) deepMerge(eff, spec.base);

        // variant merged into idle first
        if (spec.variant && spec.variants?.[spec.variant]) {
            spec.idle = deepMerge(deepClone(spec.idle ?? {}), spec.variants[spec.variant]);
        }

        // idle
        if (spec.idle) deepMerge(eff, spec.idle);

        // state priority
        const chain: StateKey[] = [
            ...(this.ariaExpanded ? (['ariaExpanded'] as StateKey[]) : []),
            ...(this.ariaCurrent ? (['ariaCurrent'] as StateKey[]) : []),
            ...(this.selected ? (['selected'] as StateKey[]) : []),
            ...(this.hovering() ? (['hover'] as StateKey[]) : []),
            ...(this.focusing() ? (['focus'] as StateKey[]) : []),
            ...(this.activing() ? (['active'] as StateKey[]) : []),
            ...(this.disabled ? (['disabled'] as StateKey[]) : []),
        ];
        for (const k of chain) if ((spec as any)[k]) deepMerge(eff, (spec as any)[k]);

        this.applyToHost(eff);
    }

    /* ===================== Apply to host ===================== */
    private applyToHost(s: UiStyle) {
        const st = this.el.nativeElement.style;

        /* Colors */
        const cText = this.color(s.colors?.text);
        const cBg = this.color(s.colors?.bg);
        const cBord = this.color(s.colors?.border?.color ?? s.border?.color);
        const cOut = this.color(s.colors?.outline?.color ?? s.outline?.color);
        const cCaret = this.color(s.colors?.caret);
        const cPH = this.color(s.colors?.placeholder);
        // selection (s.colors?.selection) is typically handled via CSS ::selection; skip inline

        st.color = cText ?? '';
        st.backgroundColor = cBg ?? '';
        st.setProperty('border-color', cBord ?? '');
        st.setProperty('outline-color', cOut ?? '');
        st.setProperty('caret-color', cCaret ?? '');
        if (cPH) st.setProperty('--ui-placeholder', cPH); // optional for ::placeholder usage elsewhere

        /* Corners */
        st.borderRadius = this.radiusToCss(s.corners?.radius) ?? '';

        /* Border */
        if (s.border?.style) st.borderStyle = s.border.style;
        edgeSize(st, 'border', s.border?.width, this.toCss);

        /* Outline */
        st.outlineWidth = this.toCss(s.outline?.width) ?? '';
        st.outlineOffset = this.toCss(s.outline?.offset) ?? '';
        // outline-color already set above (colors.outline.color)

        /* Spacing & Layout */
        edgeSize(st, 'padding', s.spacing?.padding, this.toCss);
        edgeSize(st, 'margin', s.spacing?.margin, this.toCss);
        st.gap = this.toCss(s.spacing?.gap) ?? '';
        const size = s.spacing?.size ?? {};
        st.width = this.toCss(size.w) ?? '';
        st.height = this.toCss(size.h) ?? '';
        st.minWidth = this.toCss(size.minW) ?? '';
        st.minHeight = this.toCss(size.minH) ?? '';
        st.maxWidth = this.toCss(size.maxW) ?? '';
        st.maxHeight = this.toCss(size.maxH) ?? '';

        /* Typography */
        if (s.typography?.font?.family) st.fontFamily = s.typography.font.family;
        st.fontSize = this.toCss(s.typography?.fontSize) ?? '';
        if (s.typography?.fontWeight != null) st.fontWeight = `${s.typography.fontWeight}`;
        st.lineHeight = this.toCss(s.typography?.lineHeight) ?? '';
        st.letterSpacing = this.toCss(s.typography?.letterSpacing) ?? '';
        if (s.typography?.textTransform) st.textTransform = s.typography.textTransform;
        if (s.typography?.textAlign) st.textAlign = s.typography.textAlign;
        if (s.typography?.whiteSpace) st.whiteSpace = s.typography.whiteSpace;
        if (s.typography?.wordBreak) st.wordBreak = s.typography.wordBreak;
        if (s.typography?.hyphens) st.hyphens = s.typography.hyphens;

        /* Effects */
        if (s.effects?.shadow) st.boxShadow = toShadow(s.effects.shadow);
        const f = buildFilter(s.effects);
        if (f.backdrop) st.setProperty('backdrop-filter', f.backdrop);
        st.filter = f.front ?? '';
        if (s.effects?.opacity != null) st.opacity = `${s.effects.opacity}`;

        /* Interactions */
        if (s.interactions?.transition) {
            const props = (s.interactions.transition.properties ?? ['color', 'background-color', 'border-color', 'outline-color', 'box-shadow']).join(', ');
            st.transitionProperty = props;
            if (s.interactions.transition.duration != null) st.transitionDuration = `${s.interactions.transition.duration}ms`;
            if (s.interactions.transition.timing) st.transitionTimingFunction = s.interactions.transition.timing;
        }
        if (s.interactions?.cursor) st.cursor = s.interactions.cursor;
        if (s.interactions?.pointerEvents) st.pointerEvents = s.interactions.pointerEvents;
    }

    /* ===================== Resolvers ===================== */
    private color(ref?: ColorRef): string | null {
        const s = (ref ?? '').trim();
        if (!s) return null;
        const token = this.themeSvc.getTokenHex(s);
        if (token) return token;
        if (s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl')) return s;
        const pal = this.themeSvc.resolveColor(s);
        if (pal) return pal;
        const last = s.split(/[.\s/:_-]+/).pop() || '';
        if (last) return this.themeSvc.resolveColor(last);
        return null;
    }
    private toCss = (v?: CssSize): string | null => {
        if (v == null) return null;
        if (typeof v === 'number') return `${v}px`;
        const s = `${v}`.trim();
        if (!s) return null;
        const maybeToken = this.themeSvc.getTokenHex(s);
        return maybeToken ?? s;
    };
    private radiusToCss(v?: UiRadiusKey | CssSize): string | null {
        if (v == null) return null;
        if (typeof v === 'string') {
            switch (v) {
                case 'none': return '0';
                case 'sm': return '0.125rem';
                case 'md': return '0.375rem';
                case 'lg': return '1rem';
                case 'xl': return '1.25rem';
                case '2xl': return '1.5rem';
                case 'full': return '9999px';
                default: return this.toCss(v);
            }
        }
        if (typeof v === 'number') return `${v}px`;
        return null;
    }
}

/* ===== Host style helpers ===== */
function edgeSize(
    st: CSSStyleDeclaration,
    prop: 'padding' | 'margin' | 'border',
    val: any,
    toCss: (v?: CssSize) => string | null
) {
    if (val == null) return;
    if (typeof val === 'number' || typeof val === 'string') {
        const v = toCss(val) ?? '';
        if (prop === 'border') st.setProperty('border-width', v);
        else st.setProperty(prop, v);
        return;
    }
    for (const [k, each] of Object.entries(val as Record<string, CssSize>)) {
        const v = toCss(each) ?? '';
        switch (k) {
            case 'x': st.setProperty(`${prop}-left`, v); st.setProperty(`${prop}-right`, v); break;
            case 'y': st.setProperty(`${prop}-top`, v); st.setProperty(`${prop}-bottom`, v); break;
            case 'top':
            case 'right':
            case 'bottom':
            case 'left': st.setProperty(`${prop}-${k}`, v); break;
            case 'all': if (prop === 'border') st.setProperty('border-width', v); else st.setProperty(prop, v); break;
        }
    }
}
function toShadow(sh?: string) {
    switch (sh) {
        case 'none': return 'none';
        case 'sm': return '0 1px 2px 0 rgba(0,0,0,0.05)';
        case 'md': return '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)';
        case 'lg': return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
        case 'xl': return '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
        default: return sh ?? 'none';
    }
}
function buildFilter(e?: UiStyle['effects']) {
    const front: string[] = [];
    if (e?.blur) front.push(`blur(${e.blur})`);
    if (e?.brightness) front.push(`brightness(${e.brightness})`);
    if (e?.contrast) front.push(`contrast(${e.contrast})`);
    if (e?.grayscale) front.push(`grayscale(${e.grayscale})`);
    const backdrop = e?.backdropBlur ? `blur(${e.backdropBlur})` : '';
    return { front: front.length ? front.join(' ') : '', backdrop };
}
