// src/app/pages/iam/services/group.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GroupDetailedDto } from '../dtos/Domain/group-detailed-dto';
import { GroupDto } from '../dtos/Domain/group-dto';
import { GroupWithMembersDto } from '../dtos/Domain/group-with-members-dto';
import { UserGroupStateDetailedDto, UserGroupStateDto } from '../dtos/Domain/user-group-state-dto';
import { PaginatedResult } from '../../core/models/paginated-result';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/group`;

  // --- GROUPS ---

  getGroup(groupId: string): Observable<GroupDetailedDto> {
    return this.http.get<GroupDetailedDto>(`${this.baseUrl}/${groupId}`);
  }

  listGroupsPaged(
    page = 1,
    pageSize = 20,
    search?: string
  ): Observable<PaginatedResult<GroupDto>> {
    return this.http.get<PaginatedResult<GroupDto>>(this.baseUrl, {
      params: { page, pageSize, ...(search ? { search } : {}) }
    });
  }

  createGroup(request: { name: string; description?: string }): Observable<GroupDto> {
    return this.http.post<GroupDto>(this.baseUrl, request);
  }

  createGroupWithOwner(request: {
    ownerId: string;
    name: string;
    description?: string;
  }): Observable<GroupDto> {
    return this.http.post<GroupDto>(`${this.baseUrl}/with-owner`, request);
  }

  updateGroup(groupId: string, dto: GroupDto): Observable<GroupDto> {
    return this.http.put<GroupDto>(`${this.baseUrl}/${groupId}`, dto);
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}`);
  }

  getGroupWithMembers(groupId: string): Observable<GroupWithMembersDto> {
    return this.http.get<GroupWithMembersDto>(`${this.baseUrl}/${groupId}/members`);
  }

  // --- MEMBERSHIP ---

  addUserToGroup(groupId: string, userId: string, stateId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${groupId}/members`, null, {
      params: { userId, stateId }
    });
  }

  removeUserFromGroup(groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}/members`, {
      params: { userId }
    });
  }

  // --- ROLE MANAGEMENT ---

  grantRole(groupId: string, userId: string, roleId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${groupId}/roles/grant`, null, {
      params: { userId, roleId }
    });
  }

  revokeRole(groupId: string, userId: string, roleId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${groupId}/roles/revoke`, null, {
      params: { userId, roleId }
    });
  }

  // --- MODERATION ---

  banUser(
    groupId: string,
    userId: string,
    bannedById: string,
    reason: string,
    unbanAt?: Date
  ): Observable<void> {
    const params: any = { userId, bannedById, reason };
    if (unbanAt) params.unbanAt = unbanAt.toISOString();
    return this.http.post<void>(`${this.baseUrl}/${groupId}/ban`, null, { params });
  }

  unbanUser(groupId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${groupId}/unban`, null, {
      params: { userId }
    });
  }

  // --- GROUP STATE CRUD ---

  getGroupState(id: string): Observable<UserGroupStateDetailedDto> {
    return this.http.get<UserGroupStateDetailedDto>(`${this.baseUrl}/states/${id}`);
  }

  listGroupStatesPaged(
    page = 1,
    pageSize = 20,
    search?: string
  ): Observable<PaginatedResult<UserGroupStateDto>> {
    return this.http.get<PaginatedResult<UserGroupStateDto>>(`${this.baseUrl}/states`, {
      params: { page, pageSize, ...(search ? { search } : {}) }
    });
  }

  createGroupState(request: {
    name: string;
    description?: string;
  }): Observable<UserGroupStateDetailedDto> {
    return this.http.post<UserGroupStateDetailedDto>(`${this.baseUrl}/states`, request);
  }

  updateGroupState(
    id: string,
    dto: UserGroupStateDetailedDto
  ): Observable<UserGroupStateDetailedDto> {
    return this.http.put<UserGroupStateDetailedDto>(`${this.baseUrl}/states/${id}`, dto);
  }

  deleteGroupState(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/states/${id}`);
  }
}