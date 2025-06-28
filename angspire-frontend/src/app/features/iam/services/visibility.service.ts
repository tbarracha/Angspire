// src/app/pages/iam/services/visibility.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { VisibilityDto } from '../dtos/visibility-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VisibilityService {
  private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/visibility`;

  get(id: string): Observable<VisibilityDto> {
    return this.http.get<VisibilityDto>(`${this.baseUrl}/${id}`);
  }

  listPaged(
    page = 1,
    pageSize = 20,
    search?: string
  ): Observable<PaginatedResult<VisibilityDto>> {
    return this.http.get<PaginatedResult<VisibilityDto>>(this.baseUrl, {
      params: { page, pageSize, ...(search ? { search } : {}) }
    });
  }

  create(dto: VisibilityDto): Observable<VisibilityDto> {
    return this.http.post<VisibilityDto>(this.baseUrl, dto);
  }

  update(id: string, dto: VisibilityDto): Observable<VisibilityDto> {
    return this.http.put<VisibilityDto>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
