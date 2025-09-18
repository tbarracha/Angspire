// input-demo.page.ts
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
      <!-- Visual Variants -->
      <section>
        <h4 class="text-lg font-medium mb-2">Visual Variants</h4>
        <p class="text-sm text-gray-600 mb-3">
          Inputs are themed via JSON. Examples below mimic <strong>outlined</strong>, <strong>filled</strong>, and <strong>ringed</strong>.
        </p>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3">
          <div class="grid gap-3">
            <!-- Outlined → Ring on hover/focus (default-ish) -->
            <app-input
              placeholder="Outlined → Ring on hover/focus"
              [theme]="{
                idle: {
                  colors: { bg:'neutral', text:'foreground-text', border:{ color:'primary' }, placeholder:'placeholder', caret:'accent', outline:{ color:'accent' } },
                  corners: { radius:'md' },
                  spacing: { padding:{ x:'0.75rem', y:'0.5rem' } }
                },
                hover: { colors: { border:{ color:'secondary' } } },
                focus: { outline:{ width:'2px', offset:'2px' } }
              }"
            ></app-input>

            <!-- Filled -->
            <app-input
              placeholder="Filled"
              [theme]="{
                idle: {
                  colors: { bg:'surface.input', text:'text.input', border:{ color:'surface.input' }, placeholder:'text.placeholder', caret:'accent' },
                  corners: { radius:'md' },
                  spacing: { padding:{ x:'0.75rem', y:'0.5rem' } }
                },
                focus: { colors:{ border:{ color:'accent' } }, outline:{ width:'2px', offset:'2px', color:'accent' } }
              }"
            ></app-input>

            <!-- Ringed (always) -->
            <app-input
              placeholder="Ringed (always)"
              [theme]="{
                idle: {
                  colors: { bg:'neutral', text:'foreground-text', border:{ color:'transparent' }, outline:{ color:'accent' }, placeholder:'text.placeholder', caret:'accent' },
                  corners: { radius:'md' },
                  spacing: { padding:{ x:'0.75rem', y:'0.5rem' } }
                },
                hover: { outline:{ width:'2px', offset:'2px' } },
                focus: { outline:{ width:'2px', offset:'2px' } }
              }"
            ></app-input>
          </div>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-input
  placeholder="Outlined → Ring on hover/focus"
  [theme]="&#123;
    idle: &#123;
      colors: &#123; bg:'neutral', text:'foreground-text', border: &#123; color:'primary' &#125;, placeholder:'placeholder', caret:'accent', outline: &#123; color:'accent' &#125; &#125;,
      corners: &#123; radius:'md' &#125;,
      spacing: &#123; padding: &#123; x:'0.75rem', y:'0.5rem' &#125; &#125;
    &#125;,
    hover: &#123; colors: &#123; border: &#123; color:'secondary' &#125; &#125; &#125;,
    focus: &#123; outline: &#123; width:'2px', offset:'2px' &#125; &#125;
  &#125;"
&gt;&lt;/app-input&gt;

&lt;app-input
  placeholder="Filled"
  [theme]="&#123;
    idle: &#123;
      colors: &#123; bg:'surface.input', text:'text.input', border: &#123; color:'surface.input' &#125;, placeholder:'text.placeholder', caret:'accent' &#125;,
      corners: &#123; radius:'md' &#125;,
      spacing: &#123; padding: &#123; x:'0.75rem', y:'0.5rem' &#125; &#125;
    &#125;,
    focus: &#123; colors: &#123; border: &#123; color:'accent' &#125; &#125;, outline: &#123; width:'2px', offset:'2px', color:'accent' &#125; &#125;
  &#125;"
&gt;&lt;/app-input&gt;

&lt;app-input
  placeholder="Ringed (always)"
  [theme]="&#123;
    idle: &#123;
      colors: &#123; bg:'neutral', text:'foreground-text', border: &#123; color:'transparent' &#125;, outline: &#123; color:'accent' &#125;, placeholder:'text.placeholder', caret:'accent' &#125;,
      corners: &#123; radius:'md' &#125;,
      spacing: &#123; padding: &#123; x:'0.75rem', y:'0.5rem' &#125; &#125;
    &#125;,
    hover: &#123; outline: &#123; width:'2px', offset:'2px' &#125; &#125;,
    focus: &#123; outline: &#123; width:'2px', offset:'2px' &#125; &#125;
  &#125;"
&gt;&lt;/app-input&gt;
        </pre>
      </section>

      <!-- Labels & Placeholder Color -->
      <section>
        <h4 class="text-lg font-medium mb-2">Labels & Placeholder Color</h4>
        <p class="text-sm text-gray-600 mb-3">
          Labels can be placed on any side. Placeholder, caret and text colors accept tokens/palette/literals.
        </p>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3 grid gap-4">
          <app-input-field
            label="Email"
            labelPosition="top"
            placeholder="you@domain.com"
            [theme]="{
              idle: { colors: { bg:'surface.input', text:'text.input', placeholder:'text.placeholder', caret:'accent', border:{ color:'primary' } }, corners:{ radius:'md' } },
              focus:{ outline:{ width:'2px', offset:'2px', color:'accent' } }
            }"
          ></app-input-field>

          <app-input-field
            label="Username"
            labelPosition="left"
            labelWidth="9rem"
            placeholder="@handle"
            [theme]="{
              idle: { colors: { bg:'surface.input', text:'text.input', placeholder:'text.placeholder', caret:'accent', border:{ color:'primary' } } }
            }"
          ></app-input-field>

          <app-input-field
            label="Search"
            labelPosition="right"
            placeholder="Find something..."
            [theme]="{
              idle: { colors: { bg:'surface.input', text:'text.input', placeholder:'text.muted', caret:'accent', border:{ color:'primary' } } }
            }"
          ></app-input-field>

          <app-input-field
            label="API key"
            labelPosition="bottom"
            placeholder="••••••••"
            [theme]="{
              idle: { colors: { bg:'surface.input', text:'text.input', placeholder:'text.subtle', caret:'accent', border:{ color:'primary' } } }
            }"
          ></app-input-field>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-input-field
  label="Email"
  labelPosition="top"
  placeholder="you&#64;domain.com"
  [theme]="&#123;
    idle: &#123; colors: &#123; bg:'surface.input', text:'text.input', placeholder:'text.placeholder', caret:'accent', border: &#123; color:'primary' &#125; &#125;, corners: &#123; radius:'md' &#125; &#125;,
    focus: &#123; outline: &#123; width:'2px', offset:'2px', color:'accent' &#125; &#125;
  &#125;"
&gt;&lt;/app-input-field&gt;
        </pre>
      </section>

      <!-- Sizes & Radius -->
      <section>
        <h4 class="text-lg font-medium mb-2">Sizes & Radius</h4>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3 grid gap-3">
          <app-input
            placeholder="Small"
            [theme]="{
              idle:{ spacing:{ padding:{ x:'0.5rem', y:'0.25rem' } , size:{ } }, corners:{ radius:'md' }, colors:{ bg:'surface.input', text:'text.input', placeholder:'text.placeholder', border:{ color:'primary' } } }
            }"
          ></app-input>

          <app-input
            placeholder="Medium (default)"
            [theme]="{
              idle:{ spacing:{ padding:{ x:'0.75rem', y:'0.5rem' } }, corners:{ radius:'md' }, colors:{ bg:'surface.input', text:'text.input', placeholder:'text.placeholder', border:{ color:'primary' } } }
            }"
          ></app-input>

          <app-input
            placeholder="Large + pill"
            [theme]="{
              idle:{ spacing:{ padding:{ x:'1rem', y:'0.75rem' } }, corners:{ radius:'full' }, colors:{ bg:'surface.input', text:'text.input', placeholder:'text.placeholder', border:{ color:'primary' } } }
            }"
          ></app-input>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-input placeholder="Small"
  [theme]="&#123; idle: &#123; spacing: &#123; padding: &#123; x:'0.5rem', y:'0.25rem' &#125; &#125;, corners: &#123; radius:'md' &#125;, colors: &#123; bg:'surface.input', text:'text.input', placeholder:'text.placeholder', border: &#123; color:'primary' &#125; &#125; &#125; &#125;"
&gt;&lt;/app-input&gt;
        </pre>
      </section>

      <!-- Disabled -->
      <section>
        <h4 class="text-lg font-medium mb-2">Disabled</h4>

        <div class="rounded-lg p-4 bg-white/60 backdrop-blur mb-3">
          <app-input
            placeholder="Can't type here"
            [disabled]="true"
            [theme]="{
              idle: { colors:{ bg:'surface.input', text:'text.input', placeholder:'text.placeholder', border:{ color:'primary' } } },
              disabled: { colors:{ bg:'#f4f4f5', text:'#a3a3a3', border:{ color:'#e5e7eb' } }, interactions:{ pointerEvents:'none' } }
            }"
          ></app-input>
        </div>

        <pre class="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
&lt;app-input placeholder="Can't type here" [disabled]="true"
  [theme]="&#123;
    idle: &#123; colors: &#123; bg:'surface.input', text:'text.input', placeholder:'text.placeholder', border: &#123; color:'primary' &#125; &#125; &#125;,
    disabled: &#123; colors: &#123; bg:'#f4f4f5', text:'#a3a3a3', border: &#123; color:'#e5e7eb' &#125; &#125;, interactions: &#123; pointerEvents:'none' &#125; &#125;
  &#125;"
&gt;&lt;/app-input&gt;
        </pre>
      </section>
    </div>
  `,
})
export class InputDemoPage {}
