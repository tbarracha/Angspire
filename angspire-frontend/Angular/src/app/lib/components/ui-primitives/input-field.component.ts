import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiDensity, UiRadius, UiVariant } from './ui-shared';
import { InputComponent } from './input-directive.component';

type LabelPos = 'top'|'left'|'right'|'bottom';

@Component({
  standalone: true,
  selector: 'app-input-field',
  imports: [CommonModule, InputComponent],
  template: `
    <!-- TOP -->
    <ng-container *ngIf="labelPosition === 'top'">
      <div class="flex flex-col gap-1">
        <label *ngIf="label" class="text-sm text-gray-700" [attr.for]="safeId()">
          {{ label }} <span *ngIf="required" class="text-red-600">*</span>
        </label>
        <app-input
          [id]="safeId()"
          [type]="type"
          [placeholder]="placeholder"
          [value]="value"
          (valueChange)="valueChange.emit($event)"
          [color]="color"
          [contrastColor]="contrastColor"
          [variantIdle]="variantIdle"
          [variantHover]="variantHover"
          [disabled]="disabled"
          [dense]="dense"
          [rounded]="rounded"
          [placeholderColor]="placeholderColor"
        />
        <div *ngIf="hint || error" class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
          {{ error || hint }}
        </div>
      </div>
    </ng-container>

    <!-- LEFT -->
    <ng-container *ngIf="labelPosition === 'left'">
      <div class="flex items-center gap-3">
        <label *ngIf="label"
               class="shrink-0 text-sm text-gray-700"
               [style.width]="labelWidth"
               [attr.for]="safeId()">
          {{ label }} <span *ngIf="required" class="text-red-600">*</span>
        </label>
        <div class="flex-1 min-w-0">
          <app-input
            [id]="safeId()"
            [type]="type"
            [placeholder]="placeholder"
            [value]="value"
            (valueChange)="valueChange.emit($event)"
            [color]="color"
            [contrastColor]="contrastColor"
            [variantIdle]="variantIdle"
            [variantHover]="variantHover"
            [disabled]="disabled"
            [dense]="dense"
            [rounded]="rounded"
            [placeholderColor]="placeholderColor"
          />
          <div *ngIf="hint || error" class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
            {{ error || hint }}
          </div>
        </div>
      </div>
    </ng-container>

    <!-- RIGHT -->
    <ng-container *ngIf="labelPosition === 'right'">
      <div class="flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <app-input
            [id]="safeId()"
            [type]="type"
            [placeholder]="placeholder"
            [value]="value"
            (valueChange)="valueChange.emit($event)"
            [color]="color"
            [contrastColor]="contrastColor"
            [variantIdle]="variantIdle"
            [variantHover]="variantHover"
            [disabled]="disabled"
            [dense]="dense"
            [rounded]="rounded"
            [placeholderColor]="placeholderColor"
          />
          <div *ngIf="hint || error" class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
            {{ error || hint }}
          </div>
        </div>
        <label *ngIf="label"
               class="shrink-0 text-sm text-gray-700"
               [style.width]="labelWidth"
               [attr.for]="safeId()">
          {{ label }} <span *ngIf="required" class="text-red-600">*</span>
        </label>
      </div>
    </ng-container>

    <!-- BOTTOM -->
    <ng-container *ngIf="labelPosition === 'bottom'">
      <div class="flex flex-col gap-1">
        <app-input
          [id]="safeId()"
          [type]="type"
          [placeholder]="placeholder"
          [value]="value"
          (valueChange)="valueChange.emit($event)"
          [color]="color"
          [contrastColor]="contrastColor"
          [variantIdle]="variantIdle"
          [variantHover]="variantHover"
          [disabled]="disabled"
          [dense]="dense"
          [rounded]="rounded"
          [placeholderColor]="placeholderColor"
        />
        <label *ngIf="label" class="text-sm text-gray-700" [attr.for]="safeId()">
          {{ label }} <span *ngIf="required" class="text-red-600">*</span>
        </label>
        <div *ngIf="hint || error" class="text-xs mt-1" [ngClass]="error ? 'text-red-600' : 'text-gray-500'">
          {{ error || hint }}
        </div>
      </div>
    </ng-container>
  `
})
export class InputFieldComponent {
  // Label
  @Input() label?: string;
  @Input() required = false;
  @Input() labelPosition: LabelPos = 'top';
  @Input() labelWidth = '8rem';

  // Help/error
  @Input() hint?: string;
  @Input() error?: string;

  // Forwarded to input
  @Input() id?: string;
  @Input() type: 'text'|'email'|'password'|'search'|'number'|'url'|'tel' = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() color: string = 'var(--accent)';
  @Input() contrastColor?: string;
  @Input() variantIdle: UiVariant = 'outlined';
  @Input() variantHover: UiVariant = 'ringed';
  @Input() disabled = false;
  @Input() dense: UiDensity = 'md';
  @Input() rounded: UiRadius = 'md';
  @Input() placeholderColor: string | null = '#9ca3af';

  private _id = signal(this.id || `in_${Math.random().toString(36).slice(2,8)}`);
  safeId() { return this.id || this._id(); }
}
