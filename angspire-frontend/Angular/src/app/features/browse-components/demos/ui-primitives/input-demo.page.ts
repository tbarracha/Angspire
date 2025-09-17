import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputComponent } from '../../../../lib/components/ui-primitives/input-directive.component';
import { InputFieldComponent } from '../../../../lib/components/ui-primitives/input-field.component';

@Component({
  standalone: true,
  selector: 'app-input-demo',
  imports: [CommonModule, InputComponent, InputFieldComponent],
  template: `
    <h3 class="text-2xl font-semibold mb-6">Input Variants</h3>

    <div class="grid gap-10">
      <!-- Variants -->
      <section>
        <h4 class="text-lg font-medium mb-2">Visual Variants</h4>
        <p class="text-sm text-gray-600 mb-3">
          Inputs support <strong>outlined</strong>, <strong>filled</strong>, and <strong>ringed</strong> styles.
        </p>

        <div class="rounded-lg p-4 bg-white mb-3">
          <div class="grid gap-3">
            <app-input placeholder="Outlined → Ring on hover/focus" />
            <app-input placeholder="Filled" variantIdle="filled" variantHover="filled" />
            <app-input placeholder="Ringed (always hover ring)" variantIdle="ringed" variantHover="ringed" />
          </div>
        </div>
      </section>

      <!-- Labels & Placeholder Color -->
      <section>
        <h4 class="text-lg font-medium mb-2">Labels & Placeholder Color</h4>
        <p class="text-sm text-gray-600 mb-3">
          Place the label on any side and customize placeholder color.
        </p>

        <div class="rounded-lg p-4 bg-white mb-3 grid gap-4">
          <app-input-field label="Email" labelPosition="top" placeholder="you@domain.com" />
          <app-input-field label="Username" labelPosition="left" placeholder="@handle" labelWidth="9rem" />
          <app-input-field label="Search" labelPosition="right" placeholder="Find something..." placeholderColor="#94a3b8" />
          <app-input-field label="API key" labelPosition="bottom" placeholder="••••••••" placeholderColor="#64748b" />
        </div>
      </section>

      <!-- Sizes & Radius -->
      <section>
        <h4 class="text-lg font-medium mb-2">Sizes & Radius</h4>
        <div class="rounded-lg p-4 bg-white mb-3 grid gap-3">
          <app-input placeholder="Small" dense="sm" rounded="md" />
          <app-input placeholder="Medium (default)" dense="md" rounded="md" />
          <app-input placeholder="Large + pill" dense="lg" rounded="full" />
        </div>
      </section>

      <!-- Disabled -->
      <section>
        <h4 class="text-lg font-medium mb-2">Disabled</h4>
        <div class="rounded-lg p-4 bg-white mb-3">
          <app-input placeholder="Can't type here" [disabled]="true" />
        </div>
      </section>
    </div>
  `
})
export class InputDemoPage {}
