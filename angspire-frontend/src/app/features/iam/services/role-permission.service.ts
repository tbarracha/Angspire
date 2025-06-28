import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { RoleDetailedDto } from '../dtos/role-dto';
import { RolePermissionDetailedDto, RolePermissionDto } from '../dtos/role-permission-dto';
import { environment } from '../../../../environments/environment';
import { StateFlag } from '../../../lib/models/state-flag';
import { RecordMap } from '../../../lib/models/record-map';

@Injectable({ providedIn: 'root' })
export class RolePermissionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/rolepermission`;

  // RecordMap caches
  private permissionCache = new RecordMap<string, RolePermissionDto>();
  private permissionDetailedCache = new RecordMap<string, RolePermissionDetailedDto>();

  constructor() {
    this.permissionCache.fetchIfStale = async (id: string) => {
      const detailed = await firstValueFrom(this.getById(id));
      return detailed ? RolePermissionService.mapDetailedToDto(detailed) : null;
    };

    this.permissionDetailedCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getById(id));
    };
  }

  // --- Mapper ---
  static mapDetailedToDto(detail: RolePermissionDetailedDto): RolePermissionDto {
    return {
      id: detail.id,
      roleId: detail.roleId,
      roleName: detail.roleName,
      permissionId: detail.permissionId,
      permissionName: detail.permissionName,
    };
  }

  // --- Cached fetch ---
  async getCachedById(id: string): Promise<RolePermissionDto | null> {
    return this.permissionCache.get(id);
  }
  async getCachedDetailedById(id: string): Promise<RolePermissionDetailedDto | null> {
    return this.permissionDetailedCache.get(id);
  }

  // --- API methods ---
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
    state = StateFlag.Active,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResult<RolePermissionDto>> {
    return this.http.get<PaginatedResult<RolePermissionDto>>(`${this.baseUrl}/by-role/${roleId}`, {
      params: { state, page, pageSize }
    });
  }

  listByPermission(
    permissionId: string,
    state = StateFlag.Active,
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
    return new Observable(subscriber => {
      this.http.post<RolePermissionDetailedDto>(`${this.baseUrl}/assign`, null, {
        params: { roleId, permissionId }
      }).subscribe({
        next: detailed => {
          // Update both caches
          this.permissionDetailedCache.set(detailed.id, detailed);
          this.permissionCache.set(detailed.id, RolePermissionService.mapDetailedToDto(detailed));
          subscriber.next(detailed);
          subscriber.complete();
        },
        error: err => subscriber.error(err)
      });
    });
  }

  removePermissionFromRole(roleId: string, permissionId: string): Observable<void> {
    return new Observable(subscriber => {
      this.http.delete<void>(`${this.baseUrl}/remove`, {
        params: { roleId, permissionId }
      }).subscribe({
        next: () => {
          // Find and remove from both caches
          // (Assuming only one RolePermission exists for roleId + permissionId)
          for (const [key, value] of this.permissionDetailedCache['records'].entries()) {
            if (value.value.roleId === roleId && value.value.permissionId === permissionId) {
              this.permissionDetailedCache.delete(key);
              this.permissionCache.delete(key);
            }
          }
          subscriber.next();
          subscriber.complete();
        },
        error: err => subscriber.error(err)
      });
    });
  }

  roleHasPermission(
    options: { roleId: string; permissionId: string } | { roleName: string; permissionName: string }
  ): Observable<boolean> {
    const params = { ...options };
    return this.http.get<boolean>(`${this.baseUrl}/has`, { params });
  }
}
