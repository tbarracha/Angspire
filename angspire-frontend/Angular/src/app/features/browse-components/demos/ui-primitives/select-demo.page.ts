import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-select-demo',
  imports: [CommonModule],
  template: `
    <h3 class="text-xl font-semibold mb-4">Select</h3>
    <p class="text-sm text-gray-600">Coming soon: color-first selects using <code>uiPrimitive</code>.</p>
  `
})
export class SelectDemoPage {}
