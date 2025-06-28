// src/app/pages/iam/services/permission.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PermissionDto,
  PermissionDetailedDto
} from '../dtos/permission-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';
import { StateFlag } from '../../../lib/models/state-flag';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/permission`;

  getById(permissionId: string): Observable<PermissionDetailedDto> {
    return this.http.get<PermissionDetailedDto>(`${this.baseUrl}/${permissionId}`);
  }

  list(state = StateFlag.Active, page = 1, pageSize = 20): Observable<PaginatedResult<PermissionDto>> {
    return this.http.get<PaginatedResult<PermissionDto>>(this.baseUrl, {
      params: { state, page, pageSize }
    });
  }

  create(dto: PermissionDetailedDto): Observable<PermissionDetailedDto> {
    return this.http.post<PermissionDetailedDto>(this.baseUrl, dto);
  }

  update(dto: PermissionDetailedDto): Observable<PermissionDetailedDto> {
    return this.http.put<PermissionDetailedDto>(this.baseUrl, dto);
  }

  delete(permissionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${permissionId}`);
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
