// sidebar-option.model.ts

export interface SidebarComponentConfigs {
    isExpandable?: boolean;
    showToggleButton?: boolean;
    collapsedWidth?: string;
    expandedWidth?: string;
    iconContainerSize?: string;
    iconSize?: string;
    labelWidth?: string;
    side?: 'left' | 'right';
}
