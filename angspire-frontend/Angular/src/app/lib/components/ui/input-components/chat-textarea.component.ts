// chat-textarea.component.ts (drop-in replacement of the class body shown)

import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

type TextareaAppearance = 'default' | 'plain';

@Component({
  selector: 'app-chat-textarea',
  standalone: true,
  imports: [CommonModule],
  template: `
    <textarea
      #ta
      [attr.rows]="rows"
      [placeholder]="placeholder"
      [class]="computedClasses"
      [disabled]="disabled"
      (input)="autoGrow()"
      (keydown)="onKeydown($event)"
      (focus)="onFocusIn()"
      (blur)="onFocusOut()"
    ></textarea>
  `
})
export class ChatTextareaComponent implements AfterViewInit {
  @ViewChild('ta') private ta!: ElementRef<HTMLTextAreaElement>;

  @Input() disabled = false;
  @Input() placeholder = 'Type your message…';
  @Input() rows = 1;
  @Input() appearance: TextareaAppearance = 'default';
  @Input() classes = '';
  @Input() maxHeightPx: number | null = null;
  @Input() autoGrowEnabled = true;
  @Input() submitOnEnter = true;

  @Output() enterPressed = new EventEmitter<void>();
  @Output() valueChanged = new EventEmitter<string>();
  /** Emits `true` on focus, `false` on blur (from the textarea only). */
  @Output() focusChanged = new EventEmitter<boolean>();

  private _pendingValue: string | null = null;
  @Input() set value(v: string | null | undefined) {
    const val = v ?? '';
    if (!this.ta) { this._pendingValue = val; return; }
    this.setValue(val);
  }

  private readonly base =
    'w-full p-2 rounded-2xl resize-none overflow-y-auto ' +
    'transition-colors duration-200 text-dark placeholder-secondary/25 ' +
    'scrollbar';

  private readonly variantDefault = 'bg-background focus:outline-none focus:ring-2 focus:ring-secondary';
  private readonly variantPlain   = 'bg-transparent focus:outline-none focus:ring-0';

  get computedClasses(): string {
    const variant = this.appearance === 'plain' ? this.variantPlain : this.variantDefault;
    return `${this.base} ${variant} ${this.classes ?? ''}`.trim();
  }

  ngAfterViewInit(): void {
    if (this._pendingValue !== null) {
      this.setValue(this._pendingValue);
      this._pendingValue = null;
    }
    this.autoGrow();
  }

  // Public API
  getValue(): string { return this.ta.nativeElement.value; }
  setValue(text: string): void {
    const el = this.ta.nativeElement;
    el.value = text ?? '';
    this.autoGrow();
    this.valueChanged.emit(el.value);
  }
  clear(): void {
    const el = this.ta.nativeElement;
    el.value = '';
    el.style.height = 'auto';
    el.style.overflowY = 'hidden';
    this.valueChanged.emit('');
  }
  focus(): void { this.ta.nativeElement.focus(); }

  // Auto-grow
  autoGrow(): void {
    if (!this.autoGrowEnabled) return;
    const el = this.ta.nativeElement;
    el.style.height = 'auto';

    let capPx: number | null = this.maxHeightPx ?? null;
    if (capPx == null) {
      const cssMax = getComputedStyle(el).maxHeight;
      if (cssMax && cssMax !== 'none') {
        const parsed = parseFloat(cssMax);
        capPx = isNaN(parsed) ? null : parsed;
      }
    }

    if (capPx == null) {
      el.style.overflowY = 'hidden';
      el.style.height = el.scrollHeight + 'px';
      this.valueChanged.emit(el.value);
      return;
    }

    el.style.overflowY = el.scrollHeight > capPx ? 'auto' : 'hidden';
    el.style.height = Math.min(el.scrollHeight, capPx) + 'px';
    this.valueChanged.emit(el.value);
  }

  // Keyboard
  onKeydown(evt: KeyboardEvent): void {
    if (!this.submitOnEnter) return;
    if (evt.key === 'Enter' && !evt.shiftKey && !this.disabled) {
      evt.preventDefault();
      this.enterPressed.emit();
    }
  }

  // Focus state (textarea only)
  onFocusIn(): void { this.focusChanged.emit(true); }
  onFocusOut(): void { this.focusChanged.emit(false); }
}
