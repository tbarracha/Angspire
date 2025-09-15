// group-roles.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  GroupRoleDto,
  CreateGroupRoleRequestDto,
  GetGroupRoleRequestDto,
  ListGroupRolesRequestDto,
  UpdateGroupRoleRequestDto,
  DeleteGroupRoleRequestDto,
  GroupRoleResponseDto,
  GroupRolesResponseDto,
  DeleteGroupRoleResponseDto
} from '../dtos/group-role-dtos';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupRolesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;       // e.g., https://localhost:7270/api
  private readonly url = `${this.baseUrl}/group/role`;

  /** POST /group/role/create */
  createRole(payload: CreateGroupRoleRequestDto): Observable<GroupRoleDto> {
    return this.http
      .post<GroupRoleResponseDto>(`${this.url}/create`, payload)
      .pipe(map(r => r.role!));
  }

  /** POST /group/role/get */
  getRole(id: string): Observable<GroupRoleDto | null> {
    const payload: GetGroupRoleRequestDto = { id };
    return this.http
      .post<GroupRoleResponseDto>(`${this.url}/get`, payload)
      .pipe(map(r => r.role));
  }

  /** POST /group/role/list */
  listRoles(payload: ListGroupRolesRequestDto = {}): Observable<GroupRoleDto[]> {
    return this.http
      .post<GroupRolesResponseDto>(`${this.url}/list`, payload)
      .pipe(map(r => r.roles));
  }

  /** POST /group/role/update */
  updateRole(payload: UpdateGroupRoleRequestDto): Observable<GroupRoleDto> {
    return this.http
      .post<GroupRoleResponseDto>(`${this.url}/update`, payload)
      .pipe(map(r => r.role!));
  }

  /** POST /group/role/delete */
  deleteRole(id: string): Observable<boolean> {
    const payload: DeleteGroupRoleRequestDto = { id };
    return this.http
      .post<DeleteGroupRoleResponseDto>(`${this.url}/delete`, payload)
      .pipe(map(r => r.success));
  }
}
