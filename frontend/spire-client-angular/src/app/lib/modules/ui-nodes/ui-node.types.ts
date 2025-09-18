// ui-node.types.ts

import { UiStyle, UiStateStyles } from "../themes/theme-types";

export interface UiNodeMeta {
  id?: string;
  name?: string;
  description?: string;
  instructions?: string;     // LLM guidance
  tags?: string[];
  data?: Record<string, any>;
}

/** JSON-first UI node */
export interface UiNode {
  kind?: string; // 'div' | 'button' | 'input' | component key
  selector?: {
    tag?: string; class?: string; id?: string;
    data?: Record<string, string>; role?: string;
  };

  style?: UiStyle;
  variant?: string | null;
  variants?: Record<string, Partial<UiStyle>>;
  states?: UiStateStyles;

  /** Content for HTML nodes */
  text?: string | null;
  html?: string | null; // use carefully

  children?: UiNode[];

  metadata?: UiNodeMeta;
}

/** Container is also a UiNode, but guarantees children array */
export interface UiNodeContainer extends UiNode {
  children: UiNode[];
}
