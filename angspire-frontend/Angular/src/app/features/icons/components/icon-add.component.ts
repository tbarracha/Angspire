// icon-add.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../../../lib/components/ui/icon-component/icon.component';
import { Icons } from '../icons'; // adjust path if necessary

@Component({
  selector: 'icon-add',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-icon
      [svg]="svg"
      [src]="src"
      [size]="size"
      [padding]="padding"
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
export class IconAddComponent {
  /** icon size in px or CSS unit */
  @Input() size: string | number = 24;

  /** icon padding in px or CSS unit */
  @Input() padding: string | number = 0;

  /** fill color (uses currentColor / inherit) */
  @Input() color: string = 'inherit';

  /** stroke color override (uses currentColor / inherit) */
  @Input() strokeColor: string = 'inherit';

  /** line thickness inside the SVG */
  @Input() strokeWidth: string | number = 1.5;

  /** alt text for accessibility */
  @Input() alt: string = '';

  /** fallback emoji */
  @Input() emoji?: string;

  get svg() { return Icons.add.svg; }
  get src() { return Icons.add.url; }
}
