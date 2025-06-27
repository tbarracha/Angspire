import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo-link',
  standalone: true,
  template: `
    <div
      [class]="
        height + ' flex items-center justify-center w-full transition-all duration-150'
      "
    >
      <div
        class="flex"
        [class]="[
          directionClass,
          gapClass
        ]"
      >
        @if (labelPosition === 'top' || labelPosition === 'left') {
          <span
            class="text-lg text-center whitespace-nowrap transition-all duration-150 ease-in-out overflow-hidden"
            [class.opacity-0]="state !== 'expanded'"
            [class.w-0]="state !== 'expanded'"
            [class.opacity-100]="state === 'expanded'"
            [class.w-auto]="state === 'expanded'"
          >
            {{ label }}
          </span>
        }

        <a
          [href]="href"
          target="_blank"
          rel="noopener noreferrer"
          [class]="height + ' aspect-square flex items-center justify-center'"
        >
          <img
            [src]="src"
            [alt]="label"
            class="h-full w-auto object-contain drop-shadow-lg"
          />
        </a>

        @if (labelPosition === 'bottom' || labelPosition === 'right') {
          <span
            class="text-lg text-center whitespace-nowrap transition-all duration-150 ease-in-out overflow-hidden"
            [class.opacity-0]="state !== 'expanded'"
            [class.w-0]="state !== 'expanded'"
            [class.opacity-100]="state === 'expanded'"
            [class.w-auto]="state === 'expanded'"
          >
            {{ label }}
          </span>
        }
      </div>
    </div>
  `
})
export class LogoLinkComponent {
  @Input() height = 'h-24';
  @Input() src = '/angspire_icon_neg.png';
  @Input() label = 'logo';
  @Input() href = 'https://github.com/tbarracha/Angspire';
  @Input() labelPosition: 'top' | 'right' | 'bottom' | 'left' = 'bottom';
  @Input() state: 'expanded' | 'collapsing' | 'collapsed' = 'expanded';

  get directionClass(): string {
    if (this.labelPosition === 'top') return 'flex-col';
    if (this.labelPosition === 'bottom') return 'flex-col-reverse';
    if (this.labelPosition === 'left') return 'flex-row-reverse';
    return 'flex-row';
  }

  get gapClass(): string {
    if (this.state === 'collapsing') return 'gap-0';
    if (this.state === 'expanded') return 'gap-2';
    return '';
  }
}
