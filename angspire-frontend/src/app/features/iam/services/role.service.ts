// role.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { RoleDto, RoleDetailedDto } from '../dtos/role-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';
import { StateFlag } from '../../../lib/models/state-flag';
import { RecordMap } from '../../../lib/models/record-map';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/role`;

  private roleCache = new RecordMap<string, RoleDto>();
  private roleDetailedCache = new RecordMap<string, RoleDetailedDto>();

  constructor() {
    // Cache for RoleDto (fetch from detailed and map)
    this.roleCache.fetchIfStale = async (id: string) => {
      const detailed = await firstValueFrom(this.getById(id));
      return detailed ? RoleService.mapDetailedToDto(detailed) : null;
    };

    // Cache for RoleDetailedDto
    this.roleDetailedCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getById(id));
    };
  }


  // --- Cached ---
  async getCachedById(id: string): Promise<RoleDto | null> {
    return this.roleCache.get(id);
  }

  async getCachedDetailedById(id: string): Promise<RoleDetailedDto | null> {
    return this.roleDetailedCache.get(id);
  }


  // --- API ---
  getById(roleId: string): Observable<RoleDetailedDto> {
    return this.http.get<RoleDetailedDto>(`${this.baseUrl}/${roleId}`);
  }

  list(state = StateFlag.Active, page = 1, pageSize = 20): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(this.baseUrl, {
      params: { state, page, pageSize }
    });
  }

  listByGroup(
    groupId: string,
    state = StateFlag.Active,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(`${this.baseUrl}/by-group/${groupId}`, {
      params: { state, page, pageSize }
    });
  }

  create(dto: RoleDetailedDto): Observable<RoleDetailedDto> {
    return this.http.post<RoleDetailedDto>(this.baseUrl, dto).pipe(
      tap(created => {
        this.roleDetailedCache.set(created.id, created);
        this.roleCache.set(created.id, RoleService.mapDetailedToDto(created));
      })
    );
  }

  update(dto: RoleDetailedDto): Observable<RoleDetailedDto> {
    return this.http.put<RoleDetailedDto>(this.baseUrl, dto).pipe(
      tap(updated => {
        this.roleDetailedCache.set(updated.id, updated);
        this.roleCache.set(updated.id, RoleService.mapDetailedToDto(updated));
      })
    );
  }

  delete(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${roleId}`).pipe(
      tap(() => {
        this.roleDetailedCache.delete(roleId);
        this.roleCache.delete(roleId);
      })
    );
  }

  searchByName(
    name: string,
    state = StateFlag.Active,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(`${this.baseUrl}/search`, {
      params: { name, state, page, pageSize }
    });
  }

  getForPermission(
    permissionId: string,
    state = StateFlag.Active,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(
      `${this.baseUrl}/for-permission/${permissionId}`,
      {
        params: { state, page, pageSize }
      }
    );
  }

  static mapDetailedToDto(role: RoleDetailedDto): RoleDto {
    return {
      id: role.id,
      name: role.name,
      groupId: role.groupId,
      permissions: role.permissions || []
    };
  }
}
