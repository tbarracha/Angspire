// tag-categories.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  TagCategoryDto,
  CreateTagCategoryRequest,
  UpdateTagCategoryRequest,
  TagCategoryResponse,
  ListTagCategoriesResponse,
  DeleteTagCategoryRequest,
  DeleteTagCategoryResponse
} from '../dtos/tag-category-dtos';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TagCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;            // e.g., https://localhost:7270/api
  private readonly url = `${this.baseUrl}/tag/category`;

  /** POST /tag/category/create */
  createCategory(payload: CreateTagCategoryRequest): Observable<TagCategoryDto> {
    return this.http
      .post<TagCategoryResponse>(`${this.url}/create`, payload)
      .pipe(map(r => r.category!));
  }

  /**
   * POST /tag/category/get
   * C# expects Guid directly → send the raw string id as the request body.
   */
  getCategory(id: string): Observable<TagCategoryDto | null> {
    return this.http
      .post<TagCategoryResponse>(`${this.url}/get`, id)
      .pipe(map(r => r.category));
  }

  /**
   * POST /tag/category/list
   * C# expects an object → send {}.
   */
  listCategories(): Observable<TagCategoryDto[]> {
    return this.http
      .post<ListTagCategoriesResponse>(`${this.url}/list`, {})
      .pipe(map(r => r.categories));
  }

  /** POST /tag/category/update */
  updateCategory(payload: UpdateTagCategoryRequest): Observable<TagCategoryDto> {
    return this.http
      .post<TagCategoryResponse>(`${this.url}/update`, payload)
      .pipe(map(r => r.category!));
  }

  /** POST /tag/category/delete */
  deleteCategory(id: string): Observable<boolean> {
    const payload: DeleteTagCategoryRequest = { id };
    return this.http
      .post<DeleteTagCategoryResponse>(`${this.url}/delete`, payload)
      .pipe(map(r => r.success));
  }
}
