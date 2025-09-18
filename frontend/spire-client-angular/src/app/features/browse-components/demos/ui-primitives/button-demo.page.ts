// button-demo.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../lib/components/ui-primitives/button-directive.component'; // path unchanged if you kept the filename

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
        <p class="text-sm text-gray-600 mb-3">
          Buttons are themed via JSON. Examples below mimic <strong>filled</strong>, <strong>outlined</strong>, and <strong>text → ringed</strong>.
        </p>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3">
          <div class="flex flex-wrap gap-2">
            <!-- Filled (accent) -->
            <app-button
              [theme]="{
                idle: {
                  colors: { bg: 'accent', text: '#fff', border: { color: 'accent' } },
                  corners: { radius: 'full' }
                },
                hover: { effects: { shadow: 'lg' } }
              }"
            >Filled</app-button>

            <!-- Outlined (accent) -->
            <app-button
            class="p-2"
              [theme]="{
                idle: {
                  colors: { bg: 'neutral', text: 'accent', border: { color: 'accent' } },
                  corners: { radius: 'full' }
                },
                hover: { colors: { bg: 'accent', text: '#fff' } }
              }"
            >Outlined</app-button>

            <!-- Text → Ringed on hover (accent) -->
            <app-button
              [theme]="{
                idle: {
                  colors: { bg: 'transparent', text: 'accent', border: { color: 'transparent' }, outline: { color: 'accent' } },
                  corners: { radius: 'full' }
                },
                hover: {
                  outline: { width: '2px', offset: '2px' }
                },
                focus: {
                  outline: { width: '2px', offset: '2px' }
                }
              }"
            >Text → Ringed</app-button>
          </div>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button
  [theme]="&#123;
    idle: &#123; colors: &#123; bg: 'accent', text: '#fff', border: &#123; color: 'accent' &#125; &#125;, corners: &#123; radius: 'full' &#125; &#125;,
    hover: &#123; effects: &#123; shadow: 'lg' &#125; &#125;
  &#125;"
&gt;Filled&lt;/app-button&gt;

&lt;app-button
  [theme]="&#123;
    idle: &#123; colors: &#123; bg: 'neutral', text: 'accent', border: &#123; color: 'accent' &#125; &#125;, corners: &#123; radius: 'full' &#125; &#125;,
    hover: &#123; colors: &#123; bg: 'accent', text: '#fff' &#125; &#125;
  &#125;"
&gt;Outlined&lt;/app-button&gt;

&lt;app-button
  [theme]="&#123;
    idle: &#123; colors: &#123; bg: 'transparent', text: 'accent', border: &#123; color: 'transparent' &#125;, outline: &#123; color: 'accent' &#125; &#125;, corners: &#123; radius: 'full' &#125; &#125;,
    hover: &#123; outline: &#123; width: '2px', offset: '2px' &#125; &#125;,
    focus: &#123; outline: &#123; width: '2px', offset: '2px' &#125; &#125;
  &#125;"
&gt;Text → Ringed&lt;/app-button&gt;
        </pre>
      </section>

      <!-- Palette examples -->
      <section>
        <h4 class="text-lg font-medium mb-2">Palette Keys</h4>
        <p class="text-sm text-gray-600 mb-3">
          Colors reference theme <code>colors</code> / tokens. Each button passes a JSON theme.
        </p>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3">
          <div class="flex flex-wrap gap-2">
            <app-button [theme]="{ idle: { colors: { bg:'primary', text:'foreground-text', border:{ color:'primary'} }, corners:{ radius:'full' } } }">Primary</app-button>
            <app-button [theme]="{ idle: { colors: { bg:'neutral', text:'secondary', border:{ color:'secondary'} }, corners:{ radius:'full' } }, hover:{ colors:{ bg:'secondary', text:'#fff' } } }">
              Secondary (outlined)
            </app-button>
            <app-button [theme]="{ idle: { colors: { bg:'transparent', text:'support', border:{ color:'transparent' }, outline:{ color:'support' } }, corners:{ radius:'full' } }, hover:{ outline:{ width:'2px', offset:'2px' } } }">
              Support (text → ring)
            </app-button>
            <app-button [theme]="{ idle: { colors: { bg:'success', text:'success-contrast', border:{ color:'success'} }, corners:{ radius:'full' } } }">Success</app-button>
            <app-button [theme]="{ idle: { colors: { bg:'warning', text:'warning-contrast', border:{ color:'warning'} }, corners:{ radius:'full' } } }">Warning</app-button>
            <app-button [theme]="{ idle: { colors: { bg:'info', text:'info-contrast', border:{ color:'info'} }, corners:{ radius:'full' } } }">Info</app-button>
            <app-button [theme]="{ idle: { colors: { bg:'error', text:'error-contrast', border:{ color:'error'} }, corners:{ radius:'full' } } }">Error</app-button>
          </div>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'primary', text:'foreground-text', border: &#123; color:'primary' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125; &#125;"&gt;Primary&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'neutral', text:'secondary', border: &#123; color:'secondary' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125;, hover: &#123; colors: &#123; bg:'secondary', text:'#fff' &#125; &#125; &#125;"&gt;Secondary (outlined)&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'transparent', text:'support', border: &#123; color:'transparent' &#125;, outline: &#123; color:'support' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125;, hover: &#123; outline: &#123; width:'2px', offset:'2px' &#125; &#125; &#125;"&gt;Support (text → ring)&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'success', text:'success-contrast', border: &#123; color:'success' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125; &#125;"&gt;Success&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'warning', text:'warning-contrast', border: &#123; color:'warning' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125; &#125;"&gt;Warning&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'info', text:'info-contrast', border: &#123; color:'info' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125; &#125;"&gt;Info&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'error', text:'error-contrast', border: &#123; color:'error' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125; &#125;"&gt;Error&lt;/app-button&gt;
        </pre>
      </section>

      <!-- Sizes & Shapes -->
      <section>
        <h4 class="text-lg font-medium mb-2">Sizes & Shapes</h4>
        <p class="text-sm text-gray-600 mb-3">
          Use <code>spacing.padding</code> and <code>corners.radius</code>.
        </p>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3">
          <div class="flex flex-wrap gap-2">
            <app-button
              [theme]="{ idle:{ colors:{ bg:'primary', text:'foreground-text' }, spacing:{ padding:{ x:'0.75rem', y:'0.375rem' } }, corners:{ radius:'md' } } }"
            >Small</app-button>

            <app-button
              [theme]="{ idle:{ colors:{ bg:'primary', text:'foreground-text' }, spacing:{ padding:{ x:'1.25rem', y:'0.75rem' } }, corners:{ radius:'lg' } } }"
            >Large</app-button>

            <app-button
              [theme]="{ idle:{ colors:{ bg:'primary', text:'foreground-text' }, spacing:{ padding:{ x:'1.25rem', y:'0.75rem' } }, corners:{ radius:'full' } } }"
            >Pill</app-button>
          </div>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'primary', text:'foreground-text' &#125;, spacing: &#123; padding: &#123; x:'0.75rem', y:'0.375rem' &#125; &#125;, corners: &#123; radius:'md' &#125; &#125; &#125;"&gt;Small&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'primary', text:'foreground-text' &#125;, spacing: &#123; padding: &#123; x:'1.25rem', y:'0.75rem' &#125; &#125;, corners: &#123; radius:'lg' &#125; &#125; &#125;"&gt;Large&lt;/app-button&gt;
&lt;app-button [theme]="&#123; idle: &#123; colors: &#123; bg:'primary', text:'foreground-text' &#125;, spacing: &#123; padding: &#123; x:'1.25rem', y:'0.75rem' &#125; &#125;, corners: &#123; radius:'full' &#125; &#125; &#125;"&gt;Pill&lt;/app-button&gt;
        </pre>
      </section>

      <!-- Disabled -->
      <section>
        <h4 class="text-lg font-medium mb-2">Disabled</h4>
        <p class="text-sm text-gray-600 mb-3">Disabled buttons are non-interactive and dimmed.</p>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3">
          <div class="flex flex-wrap gap-2">
            <app-button [disabled]="true"
              [theme]="{ idle:{ colors:{ bg:'primary', text:'foreground-text' } }, disabled:{ colors:{ bg:'#f4f4f5', text:'#a3a3a3', border:{ color:'#e5e7eb' } }, interactions:{ pointerEvents:'none', cursor:'not-allowed' } } }"
            >
              Disabled
            </app-button>
          </div>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-button [disabled]="true"
  [theme]="&#123; idle: &#123; colors: &#123; bg:'primary', text:'foreground-text' &#125; &#125;, disabled: &#123; colors: &#123; bg:'#f4f4f5', text:'#a3a3a3', border: &#123; color:'#e5e7eb' &#125; &#125;, interactions: &#123; pointerEvents:'none', cursor:'not-allowed' &#125; &#125; &#125;"
&gt;Disabled&lt;/app-button&gt;
        </pre>
      </section>
    </div>
  `
})
export class ButtonDemoPage {}
