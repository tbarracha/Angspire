// tag-dtos.ts

export interface TagDto {
  id: string;
  displayName: string;
  icon?: string;
  iconType?: string;
  description?: string;
  categoryId: string;
  parentTagId?: string;
}

export interface CreateTagRequest {
  displayName: string;
  icon?: string;
  iconType?: string;
  description?: string;
  categoryId: string;
  parentTagId?: string;
}

export interface UpdateTagRequest {
  id: string;
  displayName?: string;
  icon?: string;
  iconType?: string;
  description?: string;
  categoryId?: string;
  parentTagId?: string;
}

export type TagSortBy = 'displayName' | 'createdAt' | 'updatedAt';
export type SortDir = 'asc' | 'desc';

export interface ListTagsRequest {
  /** Optional. Filter by CategoryId (GUID). */
  categoryId?: string;

  /** Optional. If categoryId is not provided, resolve by category Name (case-insensitive). */
  categoryName?: string;

  /** Optional. Filter by ParentTagId (GUID). */
  parentTagId?: string;

  /** Optional. Default 'displayName'. */
  sortBy?: TagSortBy;

  /** Optional. Default 'asc'. */
  sortDir?: SortDir;
}

export interface TagResponse {
  tag: TagDto | null;
}

export interface ListTagsResponse {
  tags: TagDto[];
}

export interface DeleteTagRequest {
  id: string;
}

export interface DeleteTagResponse {
  success: boolean;
}
