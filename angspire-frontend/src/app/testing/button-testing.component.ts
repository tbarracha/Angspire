import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../shared/components/button.component';

@Component({
  selector: 'app-button-testing',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="grid md:grid-cols-2 gap-8">
      <!-- ButtonComponent column -->
      <div>
        <h3 class="text-lg font-semibold mb-4">ButtonComponent</h3>
        <div class="flex flex-col gap-4">
          <app-button
            type="info"
            styleIdle="filled"
            styleHover="outlined"
          >Info Filled</app-button>

          <app-button
            type="error"
            styleIdle="outlined"
            styleHover="filled"
          >Error Outlined</app-button>

          <app-button
            type="accent"
            styleIdle="text"
            styleHover="filled"
          >Accent Text</app-button>

          <app-button
            type="warning"
            styleIdle="filled"
            styleHover="outlined"
            [disabled]="true"
          >Disabled Warning</app-button>
        </div>
      </div>
    </div>
  `
})
export class ButtonTestingComponent {}
