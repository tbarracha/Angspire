// ui-theme.spacing.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';
import { CssSize } from '../theme-types';

@Directive({ selector: '[uiThemeSpacing]', standalone: true })
export class UiThemeSpacingDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeSpacing') padding?: any;
  @Input() uiThemeMargin?: any;
  @Input() uiThemeGap?: CssSize;
  @Input() uiThemeW?: CssSize; @Input() uiThemeH?: CssSize;
  @Input() uiThemeMinW?: CssSize; @Input() uiThemeMinH?: CssSize;
  @Input() uiThemeMaxW?: CssSize; @Input() uiThemeMaxH?: CssSize;

  ngOnChanges() {
    this.ctrl.updatePart('spacing', {
      padding: this.padding, margin: this.uiThemeMargin, gap: this.uiThemeGap,
      size: { w: this.uiThemeW, h: this.uiThemeH, minW: this.uiThemeMinW, minH: this.uiThemeMinH, maxW: this.uiThemeMaxW, maxH: this.uiThemeMaxH }
    }, 'idle');
  }
}
