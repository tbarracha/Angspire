export interface TableGridColumn<T = any> {
  field: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface TableGridConfig<T = any> {
  columns: TableGridColumn<T>[];
  pageSizeOptions?: number[];
  actions?: {
    label: string;
    icon?: string;
    callback: (row: T) => void;
    colorClass?: string;
  }[];
}
