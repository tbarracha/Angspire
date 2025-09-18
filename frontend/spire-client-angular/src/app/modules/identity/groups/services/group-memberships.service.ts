// group-memberships.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AddGroupMemberRequestDto,
  RemoveGroupMemberRequestDto,
  AddMemberRoleRequestDto,
  RemoveMemberRoleRequestDto,
  ListGroupMembersRequestDto,
  GroupMembersResponseDto,
  OperationSuccessResponseDto,
  GroupMemberDto
} from '../dtos/group-membership-dtos';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupMembershipsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;           // e.g., https://localhost:7270/api
  private readonly base = `${this.baseUrl}/group/member`;

  /** POST /group/member/add */
  addMember(payload: AddGroupMemberRequestDto): Observable<boolean> {
    return this.http
      .post<OperationSuccessResponseDto>(`${this.base}/add`, payload)
      .pipe(map(r => r.success));
  }

  /** POST /group/member/remove */
  removeMember(payload: RemoveGroupMemberRequestDto): Observable<boolean> {
    return this.http
      .post<OperationSuccessResponseDto>(`${this.base}/remove`, payload)
      .pipe(map(r => r.success));
  }

  /** POST /group/member/role/set */
  setMemberRole(payload: AddMemberRoleRequestDto): Observable<boolean> {
    return this.http
      .post<OperationSuccessResponseDto>(`${this.base}/role/set`, payload)
      .pipe(map(r => r.success));
  }

  /** POST /group/member/role/revoke */
  revokeMemberRole(payload: RemoveMemberRoleRequestDto): Observable<boolean> {
    return this.http
      .post<OperationSuccessResponseDto>(`${this.base}/role/revoke`, payload)
      .pipe(map(r => r.success));
  }

  /** POST /group/member/list */
  listMembers(payload: ListGroupMembersRequestDto): Observable<GroupMemberDto[]> {
    return this.http
      .post<GroupMembersResponseDto>(`${this.base}/list`, payload)
      .pipe(map(r => r.members));
  }
}
