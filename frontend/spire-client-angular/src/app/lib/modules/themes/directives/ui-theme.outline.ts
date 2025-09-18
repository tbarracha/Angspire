// ui-theme.outline.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';
import { CssSize } from '../theme-types';

@Directive({ selector: '[uiThemeOutline]', standalone: true })
export class UiThemeOutlineDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeOutline') width?: CssSize;
  @Input() uiThemeOutlineOffset?: CssSize;
  @Input() uiThemeOutlineColor?: string | null;

  ngOnChanges() {
    this.ctrl.updatePart('outline', {
      width: this.width,
      offset: this.uiThemeOutlineOffset,
      color: this.uiThemeOutlineColor ?? undefined,
    }, 'idle');
  }
}
