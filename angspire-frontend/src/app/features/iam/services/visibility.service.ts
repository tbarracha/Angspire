import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { VisibilityDto } from '../dtos/visibility-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';
import { RecordMap } from '../../../lib/models/record-map';

@Injectable({ providedIn: 'root' })
export class VisibilityService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/visibility`;

  // Cache
  private visibilityCache = new RecordMap<string, VisibilityDto>();

  constructor() {
    this.visibilityCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.get(id));
    };
  }

  // --- Cached Fetch ---
  async getCached(id: string): Promise<VisibilityDto | null> {
    return this.visibilityCache.get(id);
  }

  // --- API Methods ---
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
    return new Observable<void>(subscriber => {
      this.http.delete<void>(`${this.baseUrl}/${id}`).subscribe({
        next: () => {
          this.visibilityCache.delete(id); // remove from cache only on success
          subscriber.next();
          subscriber.complete();
        },
        error: err => subscriber.error(err)
      });
    });
  }

}
