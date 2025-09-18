// tags.service.ts
import { Injectable, inject } from '@angular/core';
import {
  TagDto,
  CreateTagRequest,
  UpdateTagRequest,
  TagResponse,
  ListTagsResponse,
  DeleteTagRequest,
  DeleteTagResponse,
  ListTagsRequest,
} from '../dtos/tag-dtos';
import { map, Observable } from 'rxjs';
import { OperationsClient } from '../../../../shared/operations-client/operations-client';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private readonly ops = inject(OperationsClient);

  /** POST /tag/create */
  createTag(payload: CreateTagRequest): Observable<TagDto> {
    return this.ops
      .postOp<CreateTagRequest, TagResponse>('tag/create', payload)
      .pipe(map(r => r.tag!));
  }

  /**
   * POST /tag/get
   * Server expects Guid directly → send the raw string id as the request body.
   */
  getTag(id: string): Observable<TagDto | null> {
    return this.ops
      .postOp<string, TagResponse>('tag/get', id)
      .pipe(map(r => r.tag));
  }

  /**
   * POST /tag/list
   * - No filters: pass {}
   * - With filters: pass a ListTagsRequest (categoryId/categoryName/parentTagId/sortBy/sortDir)
   */
  listTags(options: ListTagsRequest = {}): Observable<TagDto[]> {
    return this.ops
      .postOp<ListTagsRequest, ListTagsResponse>('tag/list', options)
      .pipe(map(r => r.tags));
  }

  /** Convenience: list all tags */
  listAllTags(): Observable<TagDto[]> {
    return this.listTags({});
  }

  /** Convenience: list by category id */
  listTagsByCategoryId(
    categoryId: string,
    sortBy?: ListTagsRequest['sortBy'],
    sortDir?: ListTagsRequest['sortDir']
  ): Observable<TagDto[]> {
    return this.listTags({ categoryId, sortBy, sortDir });
  }

  /** Convenience: list by category name */
  listTagsByCategoryName(
    categoryName: string,
    sortBy?: ListTagsRequest['sortBy'],
    sortDir?: ListTagsRequest['sortDir']
  ): Observable<TagDto[]> {
    return this.listTags({ categoryName, sortBy, sortDir });
  }

  /** list tags for the AI generation category (server category name: "AI Generation") */
  listGenerationTags(
    sortBy?: ListTagsRequest['sortBy'],
    sortDir?: ListTagsRequest['sortDir']
  ): Observable<TagDto[]> {
    return this.listTagsByCategoryName('AI Generation', sortBy, sortDir);
  }

  /** Convenience: list children of a tag */
  listChildTags(
    parentTagId: string,
    sortBy?: ListTagsRequest['sortBy'],
    sortDir?: ListTagsRequest['sortDir']
  ): Observable<TagDto[]> {
    return this.listTags({ parentTagId, sortBy, sortDir });
  }

  /** POST /tag/update */
  updateTag(payload: UpdateTagRequest): Observable<TagDto> {
    return this.ops
      .postOp<UpdateTagRequest, TagResponse>('tag/update', payload)
      .pipe(map(r => r.tag!));
  }

  /** POST /tag/delete */
  deleteTag(id: string): Observable<boolean> {
    const payload: DeleteTagRequest = { id };
    return this.ops
      .postOp<DeleteTagRequest, DeleteTagResponse>('tag/delete', payload)
      .pipe(map(r => r.success));
  }
}
