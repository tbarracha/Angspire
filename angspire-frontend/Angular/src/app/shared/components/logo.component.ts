// logo.component.ts
import { Component } from '@angular/core';
import { IconLogoComponent } from "./icon-logo.component";

@Component({
  selector: 'app-logo',
  imports: [IconLogoComponent],
  template: `
    <div class="flex items-center gap-2">
      <icon-logo></icon-logo>
      <span class="text-lg font-semibold text-center">
        Genspire
      </span>
    </div>
  `,
})
export class LogoComponent {

}
