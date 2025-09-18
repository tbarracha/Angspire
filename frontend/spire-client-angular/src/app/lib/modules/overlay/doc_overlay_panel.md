# Overlay Panels — Angspire Pattern Guide

## TL;DR (Quick Start)

**Use a single component** with an embedded `ng-template` for the overlay content and open it via `OverlayPanelService.openTemplate(...)`.

```ts
// In your component
@ViewChild('trigger', {read: ElementRef}) trigger!: ElementRef<HTMLElement>;
@ViewChild('panelTpl', {read: TemplateRef}) panelTpl!: TemplateRef<any>;

open() {
  const h = this.panels.openTemplate(
    this.trigger.nativeElement,
    this.panelTpl,
    this.vcr,
    this.env,
    { title: 'My Panel' }
  );
  // h.close() to programmatically close
}
```

```html
<!-- Trigger -->
<button #trigger (click)="open()">Open</button>

<!-- Overlay content (no chrome here; shell provides it) -->
<ng-template #panelTpl>
  <!-- your content -->
</ng-template>
```

---

## Core Pieces (what you already have)

* **SmartOverlayService**
  Root-level CDK overlay creation, positioning, outside-click + `Esc` close, toggle, and map of open overlays.

* **GenericOverlayPanelComponent** (the *shell*)
  Provides overlay **chrome**: rounded card, border, shadow, optional title/close, scrollable body, size constraints. Accepts a **portal** (component or template) as content.

* **OverlayPanelService**
  One-call API:

  * `openTemplate(anchor, template, vcr, env, opts)` → Use this for the *single-component* simplicity pattern.
  * `open(anchor, InnerComponent, env, opts)` → Use this when you want a separate, reusable inner component (advanced).

---

## Design Rules (keep overlays consistent)

1. **One source of chrome.**
   The shell (GenericOverlayPanel) owns padding, border, radius, shadow, header.
   Your **content** must be *chrome-less*.

2. **Root-level rendering.**
   Overlays are attached to the document root via CDK → no clipping by parent containers.

3. **Declarative content.**
   Prefer `openTemplate(...)` so a **single component** can be both the trigger and the content provider.

4. **Predictable positioning.**
   Default fallback order: `['bottom-end','bottom-start','top-end','top-start']`. Override per use case.

---

## API Reference

### `OverlayPanelService.openTemplate(...)`

```ts
openTemplate(
  anchor: HTMLElement,
  template: TemplateRef<any>,
  vcr: ViewContainerRef,
  env: EnvironmentInjector,
  opts?: {
    title?: string;
    showClose?: boolean;         // default: true
    paddingClass?: string | null;// default: 'p-3'
    width?: string;              // default: 'min(720px,94vw)'
    maxWidth?: string;           // default: '94vw'
    maxHeight?: string;          // default: '75vh'
    position?: PositionKey | PositionKey[];
    panelClass?: string | string[];
    onClose?: () => void;
  }
): { overlayRef; panelRef; close: () => void }
```

### `OverlayPanelService.open(...)` (component content)

```ts
open<TInner>(
  anchor: HTMLElement,
  inner: Type<TInner>,
  env: EnvironmentInjector,
  opts?: {
    // same visual/positioning options as openTemplate
    innerInputs?: Partial<TInner>; // seed @Input()s
    innerData?: any;               // inject via OVERLAY_DATA
  }
): { overlayRef; panelRef; innerRef; close: () => void }
```

### Position keys

`'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'left' | 'left-start' | 'left-end'`

---

## Recipes

### 1) Single-component overlay (recommended)

**Why**: minimal coupling, easiest to read, aligns with “simplicity principle”.

```ts
// my-feature.component.ts
@ViewChild('trigger', {read: ElementRef}) trigger!: ElementRef<HTMLElement>;
@ViewChild('panel',   {read: TemplateRef}) panel!: TemplateRef<any>;
private closeOverlay?: () => void;

open() {
  const h = this.panelSvc.openTemplate(this.trigger.nativeElement, this.panel, this.vcr, this.env, {
    title: 'Choose item',
    paddingClass: 'p-3',
    width: 'min(480px, 94vw)',
  });
  this.closeOverlay = h.close;
}

close() { this.closeOverlay?.(); }
```

```html
<button #trigger (click)="open()">Open</button>

<ng-template #panel>
  <div class="space-y-2">
    <!-- content with no outer card chrome -->
  </div>
</ng-template>
```

### 2) Component-as-content (advanced/reusable)

```ts
// Caller:
const h = this.panelSvc.open(this.trigger.nativeElement, ItemListInnerComponent, this.env, {
  title: 'Actions',
  innerInputs: { groups, config },     // set @Input()s
  // innerData: { ... }                 // inject via OVERLAY_DATA
});
```

```ts
// Inner component (content only)
constructor(@Inject(OVERLAY_DATA) public data: any,
            @Inject(OVERLAY_CLOSE) private close: () => void) {}
onDone() { this.close(); }
```

---

## Customization

* **Chrome & spacing:** `paddingClass`, `width`, `maxHeight`.
* **Header:** `title`, `showClose`.
* **Panel container classes:** `panelClass` (rarely needed; shell uses its own chrome).
* **Z-index:** If needed once globally:

  ```css
  .cdk-overlay-container { z-index: 9999; }
  ```

---

## Closing & Data Flow

* **User closes**: click outside (handled), press `Esc` (handled), header ✕ (shell).
* **Programmatic**: `handle.close()`.
* **From content (component mode)**: inject `OVERLAY_CLOSE` and call it.
* **Pass data**:

  * Template mode: use component’s fields directly.
  * Component mode: `innerInputs` for `@Input()`, or DI via `OVERLAY_DATA`.

---

## Accessibility

* Header includes a close button and `Esc` works.
* If the panel is interactive-heavy, consider adding focus management:

  * Set initial focus in `ngAfterViewInit`.
  * Optionally add `cdkTrapFocus` on the shell body (small augmentation if needed).

---

## When to Use Which

| Use case                          | `openTemplate(...)` | `open(...)`                                   |
| --------------------------------- | ------------------- | --------------------------------------------- |
| Simple picker, menu, quick editor | ✅                   | —                                             |
| Reusable content across modules   | —                   | ✅                                             |
| Needs DI tokens (`OVERLAY_DATA`)  | —                   | ✅ (or extend template approach with services) |

**Pros (current approach):**

* Single component per feature (template portal) → very low overhead.
* Root-level overlay, correct positioning & closing behavior by default.
* Uniform chrome across all overlays (cohesive UX).

**Cons / Watchouts:**

* The shell is responsible for chrome; don’t duplicate borders/shadows in content.
* If you need focus trapping, add it to the shell (not included by default).
* Avoid nesting many overlays; manage one at a time via `SmartOverlayService` keys if needed.

---

## Troubleshooting

* **“Two panels” showing** → Remove outer card chrome from your content. The shell already provides it.
* **Overlay clipped or hidden** → Ensure you’re using `OverlayPanelService` (root overlay).
* **Opens in wrong place** → Check `anchor` element passed; consider `position` overrides.
* **Not closing** → Keep the `handle` from `openTemplate(...)` and call `close()`, or inject/use `OVERLAY_CLOSE` in component mode.
* **Tailwind classes not applying** → Put utilities directly in **template attributes**, not in `styles: [\`@apply...\`]\`.

---

## Pattern Checklist (copy/paste)

* Content has **no** outer card chrome.
* Use `openTemplate(...)` for single-component overlays.
* Position defaults good; override when anchored to right edges.
* Don’t forget to store and call `close()` when selection is made.
* Keep overlay sizes reasonable (`min(… , 94vw)`, `maxHeight: 75vh`).
