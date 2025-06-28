import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Bubble {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

@Component({
  selector: 'app-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="absolute rounded-full shadow-md cursor-pointer transition-transform active:scale-90"
      [ngStyle]="{
        left: x + 'px',
        bottom: y + 'px',
        width: size + 'px',
        height: size + 'px',
        background: color
      }"
      (mousedown)="pop()"
    ></div>
  `,
})
export class BubbleComponent {
  @Input() id!: number;
  @Input() x!: number;
  @Input() y!: number;
  @Input() color: string = '#4FC3F7';
  @Input() size: number = 40;

  @Output() popped = new EventEmitter<number>();

  pop() {
    this.popped.emit(this.id);
  }
}
