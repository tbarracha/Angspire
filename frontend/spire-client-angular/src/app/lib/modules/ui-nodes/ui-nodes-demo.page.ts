// ui-nodes-demo.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiNodeContainerComponent } from './ui-node-container.component';
import { UiNodeContainer } from './ui-node.types';

@Component({
  standalone: true,
  imports: [CommonModule, UiNodeContainerComponent],
  template: `
    <ui-node-container [phase]="'themed'" [container]="tree" />
  `
})
export class DemoPage {
  tree: UiNodeContainer = {
    kind: 'div',
    children: [
      {
        kind: 'div',
        metadata: { name: 'Card', description: 'Themed card' },
        style: {
          colors: { bg: 'background', text: 'foreground-text' },
          border: { width: { all: '1px' }, style: 'solid', color: 'primary' },
          corners: { radius: 'lg' },
          spacing: { padding: { all: '1rem' }, gap: '0.5rem' },
          effects: { shadow: 'md' },
        },
        children: [
          { kind: 'p', text: 'Hello JSON-first UI.' },
          {
            kind: 'button',
            text: 'Save',
            variants: {
              filled: { colors: { bg: 'accent', text: 'accent-contrast', border: { color: 'accent' } } },
              outlined: { colors: { bg: 'neutral', text: 'accent', border: { color: 'accent' } } }
            },
            variant: 'filled',
            states: { hover: { effects: { shadow: 'lg' } }, focus: { outline: { width: '2px', offset: '2px' } } }
          }
        ]
      }
    ]
  };
}
