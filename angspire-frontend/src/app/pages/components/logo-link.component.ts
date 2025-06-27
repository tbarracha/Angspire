import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo-link',
  standalone: true,
  imports: [],
  template: `
    <div [class]="height + ' aspect-square'">
      <a
        [href]="href"
        target="_blank"
        rel="noopener noreferrer"
        class="block w-full h-full"
      >
        <img
          [src]="src"
          [alt]="alt"
          class="h-full w-full object-contain drop-shadow-lg"
        />
      </a>
    </div>
  `
})
export class LogoLinkComponent {
  @Input() height = 'h-24';
  @Input() src = '/angspire_icon_neg.png';
  @Input() alt = 'logo';
  @Input() href = 'https://github.com/tbarracha/Angspire';
}
