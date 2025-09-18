// ui-theme.interactions.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';

@Directive({ selector: '[uiThemeInteractions]', standalone: true })
export class UiThemeInteractionsDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeInteractions') properties?: string[];
  @Input() uiThemeDuration?: number;
  @Input() uiThemeTiming?: string;
  @Input() uiThemeCursor?: string;
  @Input() uiThemePointerEvents?: 'auto'|'none';

  ngOnChanges() {
    this.ctrl.updatePart('interactions', {
      transition: { properties: this.properties, duration: this.uiThemeDuration, timing: this.uiThemeTiming },
      cursor: this.uiThemeCursor,
      pointerEvents: this.uiThemePointerEvents,
    }, 'idle');
  }
}
