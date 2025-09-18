// tag-category-dtos.ts

export interface TagCategoryDto {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconType?: string;
  parentCategoryId?: string;
}

export interface CreateTagCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  iconType?: string;
  parentCategoryId?: string;
}

export interface UpdateTagCategoryRequest {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  iconType?: string;
  parentCategoryId?: string;
}

export interface TagCategoryResponse {
  category: TagCategoryDto | null;
}

export interface ListTagCategoriesResponse {
  categories: TagCategoryDto[];
}

export interface DeleteTagCategoryRequest {
  id: string;
}

export interface DeleteTagCategoryResponse {
  success: boolean;
}
