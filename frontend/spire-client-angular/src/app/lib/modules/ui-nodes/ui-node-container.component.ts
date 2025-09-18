// ui-node-container.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiNode, UiNodeContainer } from './ui-node.types';
import { UiNodeComponent } from './ui-node.component';
import { UiPhase } from '../themes/theme-types';

@Component({
  selector: 'ui-node-container',
  standalone: true,
  imports: [CommonModule, UiNodeComponent],
  template: `
    @if (container?.children?.length) {
      @for (n of container?.children; track n.metadata?.id || n.metadata?.name || $index) {
        <ui-node [node]="n" [phase]="phase" />
      }
    } @else if (nodes?.length) {
      @for (n of nodes; track n.metadata?.id || n.metadata?.name || $index) {
        <ui-node [node]="n" [phase]="phase" />
      }
    }
  `
})
export class UiNodeContainerComponent {
  @Input() phase: UiPhase = 'themed';
  @Input() container?: UiNodeContainer;
  @Input() nodes?: UiNode[];
}
