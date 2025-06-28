// src/app/pages/iam/services/role-permission.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResult } from '../../core/models/paginated-result';
import { RoleDetailedDto } from '../dtos/Domain/role-dto';
import { RolePermissionDetailedDto, RolePermissionDto } from '../dtos/Domain/role-permission-dto';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RolePermissionService {
  private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/rolepermission`;

  getById(id: string): Observable<RolePermissionDetailedDto> {
    return this.http.get<RolePermissionDetailedDto>(`${this.baseUrl}/${id}`);
  }

  getRoleWithPermissions(roleId: string): Observable<RoleDetailedDto> {
    return this.http.get<RoleDetailedDto>(`${this.baseUrl}/${roleId}/with-permissions`);
  }

  getRoleWithPermissionsByName(roleName: string): Observable<RoleDetailedDto> {
    return this.http.get<RoleDetailedDto>(`${this.baseUrl}/${roleName}/with-permissions`);
  }

  listByRole(
    roleId: string,
    state = 'ACTIVE',
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RolePermissionDto>> {
    return this.http.get<PaginatedResult<RolePermissionDto>>(`${this.baseUrl}/by-role/${roleId}`, {
      params: { state, page, pageSize }
    });
  }

  listByPermission(
    permissionId: string,
    state = 'ACTIVE',
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RolePermissionDto>> {
    return this.http.get<PaginatedResult<RolePermissionDto>>(
      `${this.baseUrl}/by-permission/${permissionId}`,
      {
        params: { state, page, pageSize }
      }
    );
  }

  assignPermissionToRole(roleId: string, permissionId: string): Observable<RolePermissionDetailedDto> {
    return this.http.post<RolePermissionDetailedDto>(`${this.baseUrl}/assign`, null, {
      params: { roleId, permissionId }
    });
  }

  removePermissionFromRole(roleId: string, permissionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/remove`, {
      params: { roleId, permissionId }
    });
  }

  roleHasPermission(
    options: { roleId: string; permissionId: string } | { roleName: string; permissionName: string }
  ): Observable<boolean> {
    const params = { ...options };
    return this.http.get<boolean>(`${this.baseUrl}/has`, { params });
  }
}
