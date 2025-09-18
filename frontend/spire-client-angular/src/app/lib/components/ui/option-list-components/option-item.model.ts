// option-list.model.ts
import { Type } from "@angular/core";

export interface OptionItemClasses {
  textClasses?: string | string[];
  textExpandedClasses?: string | string[];
  bgClasses?: string | string[];
  bgExpandedClasses?: string | string[];
}

export interface IOptionItemBase {
  id?: string;

  icon?: string;
  emoji?: string;
  iconComponent?: Type<any>;
  iconComponentInputs?: any;

  iconComponentCollapsed?: Type<any>;
  iconComponentExpanded?: Type<any>;

  showIcon?: boolean;
  showLabel?: boolean;
  rowWidth?: string | null;
  labelWidth?: string | null;
  gap?:string | null;
  classes?: OptionItemClasses;
  componentInputs?: any;
}

export interface IOptionItemConfig extends IOptionItemBase {
  label?: string;
  onClick: () => void;
  component?: never;
}

export interface IOptionItemAsComponentConfig extends IOptionItemBase {
  component: Type<any>;
  componentInputs?: any;
  label?: never;
  onClick?: never;
}

export type OptionItem = IOptionItemConfig | IOptionItemAsComponentConfig;

export interface OptionListGroup extends IOptionItemBase {
  title?: OptionItem;
  items: OptionItem[];
}

export interface OptionListConfig extends IOptionItemBase {
  dense?: boolean;
  listGroups?: OptionListGroup[];
}
