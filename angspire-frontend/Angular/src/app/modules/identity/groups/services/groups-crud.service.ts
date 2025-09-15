// groups-crud.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  GroupDto,
  CreateGroupRequestDto,
  GetGroupRequestDto,
  ListGroupsRequestDto,
  UpdateGroupRequestDto,
  DeleteGroupRequestDto,
  GroupResponseDto,
  GroupsResponseDto,
  DeleteGroupResponseDto
} from '../dtos/group-dtos';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupsCrudService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;      // e.g., https://localhost:7270/api
  private readonly url = `${this.baseUrl}/group`;

  /** POST /group/create */
  createGroup(payload: CreateGroupRequestDto): Observable<GroupDto> {
    return this.http
      .post<GroupResponseDto>(`${this.url}/create`, payload)
      .pipe(map(r => r.group!));
  }

  /** POST /group/get */
  getGroup(id: string): Observable<GroupDto | null> {
    const payload: GetGroupRequestDto = { id };
    return this.http
      .post<GroupResponseDto>(`${this.url}/get`, payload)
      .pipe(map(r => r.group));
  }

  /** POST /group/list (membership-gated by backend) */
  listGroups(payload: ListGroupsRequestDto): Observable<GroupDto[]> {
    return this.http
      .post<GroupsResponseDto>(`${this.url}/list`, payload)
      .pipe(map(r => r.groups));
  }

  /** POST /group/update */
  updateGroup(payload: UpdateGroupRequestDto): Observable<GroupDto> {
    return this.http
      .post<GroupResponseDto>(`${this.url}/update`, payload)
      .pipe(map(r => r.group!));
  }

  /** POST /group/delete */
  deleteGroup(id: string): Observable<boolean> {
    const payload: DeleteGroupRequestDto = { id };
    return this.http
      .post<DeleteGroupResponseDto>(`${this.url}/delete`, payload)
      .pipe(map(r => r.success));
  }
}
