// icon-logo.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../../lib/components/ui/icon-component/icon.component';
import { logo } from '../../features/icons/icons'; // adjust path if necessary

@Component({
  selector: 'icon-logo',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-icon
      class="text-light"
      [svg]="svg"
      [src]="src"
      [size]="size"
      [color]="color"
      [strokeColor]="strokeColor"
      [strokeWidth]="strokeWidth"
      [alt]="alt"
      [emoji]="emoji"
    >
      <ng-content />
    </app-icon>
  `
})
export class IconLogoComponent {
  /** icon size in px or CSS unit */
  @Input() size: string | number = 24;

  /** fill color (uses currentColor / inherit) */
  @Input() color: string = 'inherit';

  /** stroke color override (uses currentColor / inherit) */
  @Input() strokeColor: string = 'inherit';

  /** line thickness inside the SVG */
  @Input() strokeWidth: string | number = 4;

  /** alt text for accessibility */
  @Input() alt: string = '';

  /** fallback emoji */
  @Input() emoji?: string;

  get svg() { return logo.svg; }
  get src() { return logo.url; }
}
