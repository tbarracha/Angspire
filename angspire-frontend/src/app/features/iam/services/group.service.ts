import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { GroupDetailedDto } from '../dtos/group-detailed-dto';
import { GroupDto } from '../dtos/group-dto';
import { GroupWithMembersDto } from '../dtos/group-with-members-dto';
import { UserGroupStateDetailedDto, UserGroupStateDto } from '../dtos/user-group-state-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';
import { RecordMap } from '../../../lib/models/record-map';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/group`;

  // --- Caches ---
  private groupCache = new RecordMap<string, GroupDto>();
  private groupDetailedCache = new RecordMap<string, GroupDetailedDto>();
  private groupWithMembersCache = new RecordMap<string, GroupWithMembersDto>();
  private groupStateCache = new RecordMap<string, UserGroupStateDto>();
  private groupStateDetailedCache = new RecordMap<string, UserGroupStateDetailedDto>();

  constructor() {
    // Set up fetchers
    this.groupCache.fetchIfStale = async (id: string) => {
      const detailed = await this.getCachedGroupDetailed(id);
      return detailed ? GroupService.mapDetailedToDto(detailed) : null;
    };
    this.groupDetailedCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getGroup(id));
    };
    this.groupWithMembersCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getGroupWithMembers(id));
    };
    this.groupStateCache.fetchIfStale = async (id: string) => {
      const detailed = await this.getCachedGroupStateDetailed(id);
      return detailed ? GroupService.mapStateDetailedToDto(detailed) : null;
    };
    this.groupStateDetailedCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getGroupState(id));
    };
  }

  
  // ---- GROUPS ----

  async getCachedGroup(id: string): Promise<GroupDto | null> {
    return this.groupCache.get(id);
  }

  async getCachedGroupDetailed(id: string): Promise<GroupDetailedDto | null> {
    return this.groupDetailedCache.get(id);
  }

  async getCachedGroupWithMembers(id: string): Promise<GroupWithMembersDto | null> {
    return this.groupWithMembersCache.get(id);
  }

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
    return this.http.post<GroupDto>(this.baseUrl, request).pipe(
      tap(group => {
        this.groupCache.set(group.id, group);
      })
    );
  }

  createGroupWithOwner(request: {
    ownerId: string;
    name: string;
    description?: string;
  }): Observable<GroupDto> {
    return this.http.post<GroupDto>(`${this.baseUrl}/with-owner`, request).pipe(
      tap(group => {
        this.groupCache.set(group.id, group);
      })
    );
  }

  updateGroup(groupId: string, dto: GroupDto): Observable<GroupDto> {
    return this.http.put<GroupDto>(`${this.baseUrl}/${groupId}`, dto).pipe(
      tap(group => {
        this.groupCache.set(group.id, group);
      })
    );
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}`).pipe(
      tap(() => {
        this.groupCache.delete(groupId);
        this.groupDetailedCache.delete(groupId);
        this.groupWithMembersCache.delete(groupId);
      })
    );
  }


  getGroupWithMembers(groupId: string): Observable<GroupWithMembersDto> {
    return this.http.get<GroupWithMembersDto>(`${this.baseUrl}/${groupId}/members`);
  }


  // ---- MEMBERSHIP ----

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


  // ---- ROLE MANAGEMENT ----

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


  // ---- MODERATION ----

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


  // ---- GROUP STATE CRUD ----

  async getCachedGroupState(id: string): Promise<UserGroupStateDto | null> {
    return this.groupStateCache.get(id);
  }

  async getCachedGroupStateDetailed(id: string): Promise<UserGroupStateDetailedDto | null> {
    return this.groupStateDetailedCache.get(id);
  }

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

  createGroupState(request: { name: string; description?: string }): Observable<UserGroupStateDetailedDto> {
    return this.http.post<UserGroupStateDetailedDto>(`${this.baseUrl}/states`, request).pipe(
      tap(state => {
        this.groupStateDetailedCache.set(state.id, state);
        this.groupStateCache.set(state.id, GroupService.mapStateDetailedToDto(state));
      })
    );
  }

  updateGroupState(
    id: string,
    dto: UserGroupStateDetailedDto
  ): Observable<UserGroupStateDetailedDto> {
    return this.http.put<UserGroupStateDetailedDto>(`${this.baseUrl}/states/${id}`, dto).pipe(
      tap(state => {
        this.groupStateDetailedCache.set(state.id, state);
        this.groupStateCache.set(state.id, GroupService.mapStateDetailedToDto(state));
      })
    );
  }

  deleteGroupState(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/states/${id}`).pipe(
      tap(() => {
        this.groupStateCache.delete(id);
        this.groupStateDetailedCache.delete(id);
      })
    );
  }


  // ---- Mappers ----

  static mapDetailedToDto(d: GroupDetailedDto): GroupDto {
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      groupType: d.groupType,
      visibility: d.visibility
    };
  }

  static mapStateDetailedToDto(d: UserGroupStateDetailedDto): UserGroupStateDto {
    return {
      id: d.id,
      name: d.name,
      description: d.description
    };
  }
}
