// icon.component.ts
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="flex items-center justify-center"
      [style.width.px]="numericSize"
      [style.height.px]="numericSize"
      [style.margin.px]="numericPadding"
    >
      @if (src && !imgBroken) {
        <img
          [src]="src"
          [alt]="alt"
          [width]="numericSize"
          [height]="numericSize"
          [style.color]="color"
          class="block"
          draggable="false"
          (error)="onImgError()"
        />
      }
      @else if (svg) {
        <span
          [innerHTML]="trustedSvg()"
          [style.width.px]="numericSize"
          [style.height.px]="numericSize"
          [style.color]="color"
          class="block"
        ></span>
      }
      @else if (emoji) {
        <span
          [style.fontSize.px]="numericSize"
          [style.lineHeight.px]="numericSize"
          [style.color]="color"
          class="block"
          aria-hidden="true"
        >{{ emoji }}</span>
      }
      @else {
        <ng-content />
      }
    </span>
  `
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);

  @Input() src?: string;
  @Input() svg?: string;
  @Input() emoji?: string;
  @Input() alt = '';
  @Input() size: string | number = 24;
  @Input() padding: string | number = 0;
  @Input() color = 'currentColor';
  @Input() strokeColor: string = 'currentColor';
  @Input() strokeWidth: string | number = 1.5;

  imgBroken = false;
  onImgError() { this.imgBroken = true; }

  private normalizeSvg(svg: string): string {
    if (!svg) return '';
    return svg
      .replace(/<svg/, `<svg width="100%" height="100%" class="aspect-square"`)
      .replace(/ width="[^"]*"/g, '')
      .replace(/ height="[^"]*"/g, '')
      .replace(/\sfill="(?!none)[^"]*"/g, ' fill="currentColor"')
      .replace(/\sstroke="[^"]*"/g, ' stroke="currentColor"')
      .replace(/\sstroke-width="[^"]*"/g, ` stroke-width="${this.strokeWidth}"`);
  }

  trustedSvg(): SafeHtml {
    const raw = this.svg ?? '';
    const processed = this.normalizeSvg(raw);
    return this.sanitizer.bypassSecurityTrustHtml(processed);
  }

  get numericSize(): number {
    const n = Number(this.size);
    return isNaN(n) ? 24 : n;
  }

  get numericPadding(): number {
    const n = Number(this.padding);
    return isNaN(n) ? 0 : n;
  }
}
