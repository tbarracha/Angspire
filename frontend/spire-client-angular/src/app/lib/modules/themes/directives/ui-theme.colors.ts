// ui-theme.colors.ts
import { Directive, Host, Input } from '@angular/core';
import { UiThemeController } from './ui-theme.controller';
import { ColorRef } from '../theme-types';

export interface ThemeColorsInput {
  text?: ColorRef; bg?: ColorRef;
  border?: ColorRef; outline?: ColorRef;
  caret?: ColorRef; placeholder?: ColorRef;
  selectionBg?: ColorRef; selectionText?: ColorRef;
}

@Directive({
  selector: '[uiThemeColors]',
  standalone: true,
})
export class UiThemeColorsDirective {
  constructor(@Host() private ctrl: UiThemeController) {}

  @Input('uiThemeColors') set idle(v: ThemeColorsInput | null) { this.push(v, 'idle'); }
  @Input() uiThemeColorsHover?: ThemeColorsInput | null;
  @Input() uiThemeColorsFocus?: ThemeColorsInput | null;
  @Input() uiThemeColorsActive?: ThemeColorsInput | null;
  @Input() uiThemeColorsDisabled?: ThemeColorsInput | null;
  @Input() uiThemeColorsSelected?: ThemeColorsInput | null;
  @Input() uiThemeColorsAriaCurrent?: ThemeColorsInput | null;
  @Input() uiThemeColorsAriaExpanded?: ThemeColorsInput | null;

  ngOnChanges() {
    this.push(this.uiThemeColorsHover, 'hover');
    this.push(this.uiThemeColorsFocus, 'focus');
    this.push(this.uiThemeColorsActive, 'active');
    this.push(this.uiThemeColorsDisabled, 'disabled');
    this.push(this.uiThemeColorsSelected, 'selected');
    this.push(this.uiThemeColorsAriaCurrent, 'ariaCurrent');
    this.push(this.uiThemeColorsAriaExpanded, 'ariaExpanded');
  }

  private push(v: ThemeColorsInput | null | undefined, state: any) {
    if (!v) return;
    this.ctrl.updatePart('colors', {
      text: v.text, bg: v.bg,
      border: v.border != null ? { color: v.border } : undefined,
      outline: v.outline != null ? { color: v.outline } : undefined,
      caret: v.caret, placeholder: v.placeholder,
      selection: (v.selectionBg || v.selectionText) ? { bg: v.selectionBg, text: v.selectionText } : undefined,
    }, state);
  }
}
