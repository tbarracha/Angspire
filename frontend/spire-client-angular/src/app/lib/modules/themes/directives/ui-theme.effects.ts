// ui-theme.effects.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';

@Directive({ selector: '[uiThemeEffects]', standalone: true })
export class UiThemeEffectsDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeEffects') shadow?: 'none'|'sm'|'md'|'lg'|'xl'|string;
  @Input() uiThemeBackdropBlur?: string;
  @Input() uiThemeBlur?: string;
  @Input() uiThemeBrightness?: string;
  @Input() uiThemeContrast?: string;
  @Input() uiThemeGrayscale?: string;
  @Input() uiThemeOpacity?: number;

  ngOnChanges() {
    this.ctrl.updatePart('effects', {
      shadow: this.shadow,
      backdropBlur: this.uiThemeBackdropBlur,
      blur: this.uiThemeBlur,
      brightness: this.uiThemeBrightness,
      contrast: this.uiThemeContrast,
      grayscale: this.uiThemeGrayscale,
      opacity: this.uiThemeOpacity,
    }, 'idle');
  }
}
