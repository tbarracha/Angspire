import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { PermissionDto, PermissionDetailedDto } from '../dtos/permission-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';
import { StateFlag } from '../../../lib/models/state-flag';
import { RecordMap } from '../../../lib/models/record-map';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/permission`;

  // --- RecordMap caches ---
  private permissionCache = new RecordMap<string, PermissionDto>();
  private permissionDetailedCache = new RecordMap<string, PermissionDetailedDto>();

  constructor() {
    this.permissionCache.fetchIfStale = async (id: string) => {
      const detailed = await firstValueFrom(this.getById(id));
      return detailed ? PermissionService.mapDetailedToDto(detailed) : null;
    };

    this.permissionDetailedCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getById(id));
    };
  }

  // --- Mapper ---
  static mapDetailedToDto(permission: PermissionDetailedDto): PermissionDto {
    return {
      id: permission.id,
      name: permission.name
    };
  }

  // --- Cached fetch ---
  async getCachedById(id: string): Promise<PermissionDto | null> {
    return this.permissionCache.get(id);
  }

  async getCachedDetailedById(id: string): Promise<PermissionDetailedDto | null> {
    return this.permissionDetailedCache.get(id);
  }

  // --- Regular API ---
  getById(permissionId: string): Observable<PermissionDetailedDto> {
    return this.http.get<PermissionDetailedDto>(`${this.baseUrl}/${permissionId}`);
  }

  list(state = StateFlag.Active, page = 1, pageSize = 20): Observable<PaginatedResult<PermissionDto>> {
    return this.http.get<PaginatedResult<PermissionDto>>(this.baseUrl, {
      params: { state, page, pageSize }
    });
  }

  create(dto: PermissionDetailedDto): Observable<PermissionDetailedDto> {
    return this.http.post<PermissionDetailedDto>(this.baseUrl, dto).pipe(
      tap(created => {
        this.permissionDetailedCache.set(created.id, created);
        this.permissionCache.set(created.id, PermissionService.mapDetailedToDto(created));
      })
    );
  }

  update(dto: PermissionDetailedDto): Observable<PermissionDetailedDto> {
    return this.http.put<PermissionDetailedDto>(this.baseUrl, dto).pipe(
      tap(updated => {
        this.permissionDetailedCache.set(updated.id, updated);
        this.permissionCache.set(updated.id, PermissionService.mapDetailedToDto(updated));
      })
    );
  }

  delete(permissionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${permissionId}`).pipe(
      tap(() => {
        this.permissionDetailedCache.delete(permissionId);
        this.permissionCache.delete(permissionId);
      })
    );
  }

  searchByName(
    name: string,
    state = StateFlag.Active,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<PermissionDto>> {
    return this.http.get<PaginatedResult<PermissionDto>>(`${this.baseUrl}/search`, {
      params: { name, state, page, pageSize }
    });
  }

  getForRole(
    roleId: string,
    state = StateFlag.Active,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<PermissionDto>> {
    return this.http.get<PaginatedResult<PermissionDto>>(`${this.baseUrl}/for-role/${roleId}`, {
      params: { state, page, pageSize }
    });
  }
}
