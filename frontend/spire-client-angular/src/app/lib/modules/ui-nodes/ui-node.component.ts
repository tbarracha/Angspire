// ui-node.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiNode } from './ui-node.types';
import { UiPhase } from '../themes/theme-types';
import { UiNodeDirective } from './node.directive';

@Component({
  selector: 'ui-node',
  standalone: true,
  imports: [CommonModule, UiNodeDirective],
  template: `
    @if (node) {
      <!-- Map kind to tag; fallback to div -->
      @if (tag === 'button') {
        <button
          uiNode
          [phase]="phase"
          [node]="node"
          [attr.type]="'button'"
          [innerHTML]="node.html || null"
        >{{ node.text || '' }}</button>
      } @else if (tag === 'input') {
        <input
          uiNode
          [phase]="phase"
          [node]="node"
          [attr.type]="'text'"
          [value]="node.text || ''"
        />
      } @else {
        <div
          uiNode
          [phase]="phase"
          [node]="node"
          [innerHTML]="node.html || null"
        >{{ node.text || '' }}
          @if (node.children?.length) {
            @for (child of node.children; track child.metadata?.id || child.metadata?.name || $index) {
              <ui-node [node]="child" [phase]="phase" />
            }
          }
        </div>
      }
    }
  `
})
export class UiNodeComponent {
  @Input() node!: UiNode;
  @Input() phase: UiPhase = 'themed';

  get tag(): string {
    const k = (this.node?.kind || '').toLowerCase();
    if (!k) return 'div';
    if (['div','section','article','span','button','input','a','p','h1','h2','h3','ul','li'].includes(k)) return k;
    // TODO: hook component registry later (custom components)
    return 'div';
  }
}
