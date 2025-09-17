import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../lib/components/ui-primitives/button-directive.component';

@Component({
  standalone: true,
  selector: 'app-button-demo',
  imports: [CommonModule, ButtonComponent],
  template: `
    <h3 class="text-2xl font-semibold mb-6">Button Variants</h3>

    <div class="grid gap-10">
      <!-- Visual Styles -->
      <section>
        <h4 class="text-lg font-medium mb-2">Visual Styles</h4>
        <p class="text-sm text-secondary mb-3">
          Buttons can be displayed as <strong>filled</strong>, <strong>outlined</strong>, or 
          <strong>text</strong>. Hover states can use a different style, such as a ring effect.
        </p>

        <!-- Preview -->
        <div class="rounded-lg p-4 bg-primay mb-3">
          <div class="flex gap-2">
            <app-button color="var(--accent)">Filled</app-button>
            <app-button color="var(--accent)" styleIdle="outlined">Outlined</app-button>
            <app-button color="var(--accent)" styleIdle="text" styleHover="ringed">Text → Ringed</app-button>
          </div>
        </div>

        <!-- Code -->
        <pre class="bg-primary text-secondary text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button color="var(--accent)"&gt;Filled&lt;/app-button&gt;
&lt;app-button color="var(--accent)" styleIdle="outlined"&gt;Outlined&lt;/app-button&gt;
&lt;app-button color="var(--accent)" styleIdle="text" styleHover="ringed"&gt;Text → Ringed&lt;/app-button&gt;
        </pre>
      </section>

      <!-- Sizes & Shapes -->
      <section>
        <h4 class="text-lg font-medium mb-2">Sizes & Shapes</h4>
        <p class="text-sm text-secondary mb-3">
          The <code>dense</code> input controls padding and text size, while 
          <code>rounded</code> sets corner radius.
        </p>

        <!-- Preview -->
        <div class="rounded-lg p-4 bg-white/50 mb-3">
          <div class="flex gap-2">
            <app-button color="var(--accent)" dense="sm">Small</app-button>
            <app-button color="var(--accent)" dense="lg" rounded="lg">Large</app-button>
          </div>
        </div>

        <!-- Code -->
        <pre class="bg-primary text-secondary text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button color="var(--accent)" dense="sm"&gt;Small&lt;/app-button&gt;
&lt;app-button color="var(--accent)" dense="lg" rounded="lg"&gt;Large&lt;/app-button&gt;
        </pre>
      </section>

      <!-- Disabled -->
      <section>
        <h4 class="text-lg font-medium mb-2">Disabled</h4>
        <p class="text-sm text-secondary mb-3">
          Disabled buttons are non-interactive and visually dimmed.
        </p>

        <!-- Preview -->
        <div class="rounded-lg p-4 bg-white/50 mb-3">
          <div class="flex gap-2">
            <app-button color="var(--accent)" [disabled]="true">Disabled</app-button>
          </div>
        </div>

        <!-- Code -->
        <pre class="bg-primary text-secondary text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button color="var(--accent)" [disabled]="true"&gt;Disabled&lt;/app-button&gt;
        </pre>
      </section>
    </div>
  `
})
export class ButtonDemoPage {}
