// ui-theme.corners.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';
import { CssSize, UiRadiusKey } from '../theme-types';

@Directive({ selector: '[uiThemeCorners]', standalone: true })
export class UiThemeCornersDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeCorners') set radius(v: UiRadiusKey | CssSize | null) {
    if (v == null) return;
    this.ctrl.updatePart('corners', { radius: v }, 'idle');
  }
  @Input() uiThemeCornersHover?: UiRadiusKey | CssSize | null;
  @Input() uiThemeCornersFocus?: UiRadiusKey | CssSize | null;
  @Input() uiThemeCornersActive?: UiRadiusKey | CssSize | null;
  @Input() uiThemeCornersDisabled?: UiRadiusKey | CssSize | null;
  @Input() uiThemeCornersSelected?: UiRadiusKey | CssSize | null;

  ngOnChanges() {
    this.push(this.uiThemeCornersHover, 'hover');
    this.push(this.uiThemeCornersFocus, 'focus');
    this.push(this.uiThemeCornersActive, 'active');
    this.push(this.uiThemeCornersDisabled, 'disabled');
    this.push(this.uiThemeCornersSelected, 'selected');
  }
  private push(v: any, state: any) { if (v != null) this.ctrl.updatePart('corners', { radius: v }, state); }
}
