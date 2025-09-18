// ui-theme.border.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';
import { CssSize } from '../theme-types';

@Directive({ selector: '[uiThemeBorder]', standalone: true })
export class UiThemeBorderDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeBorder') width?: any; // number|string|per-side object
  @Input() uiThemeBorderStyle?: 'solid'|'dashed'|'dotted'|'none';
  @Input() uiThemeBorderColor?: string | null;

  ngOnChanges() {
    this.ctrl.updatePart('border', {
      width: this.width,
      style: this.uiThemeBorderStyle,
      color: this.uiThemeBorderColor ?? undefined,
    }, 'idle');
  }
}
