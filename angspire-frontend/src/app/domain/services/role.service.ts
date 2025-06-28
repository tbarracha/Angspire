// src/app/pages/iam/services/role.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RoleDto,
  RoleDetailedDto
} from '../dtos/Domain/role-dto';
import { PaginatedResult } from '../../core/models/paginated-result';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/role`;

  getById(roleId: string): Observable<RoleDetailedDto> {
    return this.http.get<RoleDetailedDto>(`${this.baseUrl}/${roleId}`);
  }

  list(state = 'ACTIVE', page = 1, pageSize = 20): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(this.baseUrl, {
      params: { state, page, pageSize }
    });
  }

  listByGroup(
    groupId: string,
    state = 'ACTIVE',
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(`${this.baseUrl}/by-group/${groupId}`, {
      params: { state, page, pageSize }
    });
  }

  create(dto: RoleDetailedDto): Observable<RoleDetailedDto> {
    return this.http.post<RoleDetailedDto>(this.baseUrl, dto);
  }

  update(dto: RoleDetailedDto): Observable<RoleDetailedDto> {
    return this.http.put<RoleDetailedDto>(this.baseUrl, dto);
  }

  delete(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${roleId}`);
  }

  searchByName(
    name: string,
    state = 'ACTIVE',
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RoleDto>> {
    return this.http.get<PaginatedResult<RoleDto>>(`${this.baseUrl}/search`, {
      params: { name, state, page, pageSize }
    });
  }

  getForPermission(
    permissionId: string,
    state = 'ACTIVE',
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
}
