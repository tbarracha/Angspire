import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionItemComponent } from './option-item.component';
import { OptionItem } from './option-item.model';

@Component({
  selector: 'option-item-toggle-group',
  standalone: true,
  imports: [CommonModule, OptionItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex"
     [style.gap]="formatGap(gap)">
      <!-- Animated background bar -->
      <div
        class="absolute transition-all duration-200 z-0"
        [ngClass]="indicatorClass"
        [style.left.px]="indicatorLeft"
        [style.width.px]="indicatorWidth"
        [style.height.px]="indicatorHeight"
        [style.top.px]="indicatorTop"
        *ngIf="indicatorWidth"
      ></div>
      <!-- Option buttons as OptionItemComponent -->
      <div
        *ngFor="let opt of options; let i = index"
        class="relative z-10"
        #optionBtn
        (click)="onOptionClick(opt, i)"
        style="cursor:pointer"
      >
        <app-option-item
          [opt]="opt"
          [expanded]="selected === opt.id"
        ></app-option-item>
      </div>
    </div>
  `
})
export class OptionItemToggleGroupComponent implements AfterViewInit, OnChanges {
  @Input() options: OptionItem[] = [];
  @Input() selected!: string;
  @Output() selectedChange = new EventEmitter<string>();
  @Input() indicatorClass: string = 'bg-primary/90 rounded-xl';
  @Input() indicatorMargin: number = 2;
  @Input() gap: number | string = 2;

  @ViewChildren('optionBtn', { read: ElementRef }) btns!: QueryList<ElementRef<HTMLDivElement>>;

  // For animated background bar
  indicatorLeft: number = 0;
  indicatorWidth: number = 0;
  indicatorHeight: number = 0;
  indicatorTop: number = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    setTimeout(() => this.updateIndicator(), 1);
    this.btns.changes.subscribe(() => this.updateIndicator());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selected'] && !changes['selected'].firstChange) {
      // Wait for DOM update
      setTimeout(() => this.updateIndicator(), 1);
    }
  }

  formatGap(gap: number | string): string {
    if (typeof gap === 'number') return `${gap}px`;
    // Accepts px, rem, %, etc
    return gap;
  }


  select(value: string, idx: number) {
    if (value !== this.selected) {
      this.selected = value;
      this.selectedChange.emit(value);
      this.updateIndicator();
    }
  }

  onOptionClick(opt: OptionItem, idx: number) {
    if (typeof (opt as any).onClick === 'function') (opt as any).onClick();
    if (opt.id) this.select(opt.id, idx);
  }

  private updateIndicator() {
    const idx = this.options.findIndex(o => o.id === this.selected);
    const btn = this.btns?.get(idx)?.nativeElement;
    if (btn) {
      this.indicatorLeft = btn.offsetLeft + this.indicatorMargin;
      this.indicatorWidth = btn.offsetWidth - this.indicatorMargin * 2;
      this.indicatorHeight = btn.offsetHeight - this.indicatorMargin * 2;
      this.indicatorTop = btn.offsetTop + this.indicatorMargin;
    }

    this.cdr.markForCheck();
  }
}