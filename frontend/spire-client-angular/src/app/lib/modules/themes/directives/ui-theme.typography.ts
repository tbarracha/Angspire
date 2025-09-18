// ui-theme.typography.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';
import { CssSize } from '../theme-types';

@Directive({ selector: '[uiThemeTypography]', standalone: true })
export class UiThemeTypographyDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeTypography') fontFamily?: string;
  @Input() uiThemeFontSize?: CssSize;
  @Input() uiThemeFontWeight?: string | number;
  @Input() uiThemeLineHeight?: CssSize;
  @Input() uiThemeLetterSpacing?: CssSize;
  @Input() uiThemeTextTransform?: 'none'|'uppercase'|'lowercase'|'capitalize';
  @Input() uiThemeTextAlign?: 'left'|'center'|'right'|'justify';
  @Input() uiThemeWhiteSpace?: string;
  @Input() uiThemeWordBreak?: string;
  @Input() uiThemeHyphens?: string;

  ngOnChanges() {
    this.ctrl.updatePart('typography', {
      font: this.fontFamily ? { family: this.fontFamily } : undefined,
      fontSize: this.uiThemeFontSize,
      fontWeight: this.uiThemeFontWeight,
      lineHeight: this.uiThemeLineHeight,
      letterSpacing: this.uiThemeLetterSpacing,
      textTransform: this.uiThemeTextTransform,
      textAlign: this.uiThemeTextAlign,
      whiteSpace: this.uiThemeWhiteSpace,
      wordBreak: this.uiThemeWordBreak,
      hyphens: this.uiThemeHyphens,
    }, 'idle');
  }
}
