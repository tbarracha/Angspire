// group-types.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  GroupTypeDto,
  CreateGroupTypeRequestDto,
  GetGroupTypeRequestDto,
  GetGroupTypeByNameRequestDto,
  ListGroupTypesRequestDto,
  UpdateGroupTypeRequestDto,
  DeleteGroupTypeRequestDto,
  GroupTypeResponseDto,
  GroupTypesResponseDto,
  DeleteGroupTypeResponseDto
} from '../dtos/group-type-dtos';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupTypesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;        // e.g., https://localhost:7270/api
  private readonly url = `${this.baseUrl}/group/type`;

  /** POST /group/type/create */
  createType(payload: CreateGroupTypeRequestDto): Observable<GroupTypeDto> {
    return this.http
      .post<GroupTypeResponseDto>(`${this.url}/create`, payload)
      .pipe(map(r => r.groupType!));
  }

  /** POST /group/type/get */
  getType(id: string): Observable<GroupTypeDto | null> {
    const payload: GetGroupTypeRequestDto = { id };
    return this.http
      .post<GroupTypeResponseDto>(`${this.url}/get`, payload)
      .pipe(map(r => r.groupType));
  }

  /** POST /group/type/get/by-name */
  getTypeByName(name: string): Observable<GroupTypeDto | null> {
    const payload: GetGroupTypeByNameRequestDto = { name };
    return this.http
      .post<GroupTypeResponseDto>(`${this.url}/get/by-name`, payload)
      .pipe(map(r => r.groupType));
  }

  /** POST /group/type/list */
  listTypes(payload: ListGroupTypesRequestDto = {}): Observable<GroupTypeDto[]> {
    return this.http
      .post<GroupTypesResponseDto>(`${this.url}/list`, payload)
      .pipe(map(r => r.groupTypes));
  }

  /** POST /group/type/update */
  updateType(payload: UpdateGroupTypeRequestDto): Observable<GroupTypeDto> {
    return this.http
      .post<GroupTypeResponseDto>(`${this.url}/update`, payload)
      .pipe(map(r => r.groupType!));
  }

  /** POST /group/type/delete */
  deleteType(id: string): Observable<boolean> {
    const payload: DeleteGroupTypeRequestDto = { id };
    return this.http
      .post<DeleteGroupTypeResponseDto>(`${this.url}/delete`, payload)
      .pipe(map(r => r.success));
  }
}
