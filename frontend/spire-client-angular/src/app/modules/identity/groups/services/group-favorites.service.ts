// group-favorites.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  SetGroupFavoriteRequestDto,
  UnsetGroupFavoriteRequestDto,
  ListGroupFavoritesByUserRequestDto,
  GroupFavoriteChangedResponseDto,
} from '../dtos/group-favorite-dtos';
import type { GroupDto, GroupsResponseDto } from '../dtos/group-dtos';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupFavoritesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;        // e.g., https://localhost:7270/api
  private readonly url = `${this.baseUrl}/group/favorite`;

  /** POST /group/favorite/set */
  setFavorite(payload: SetGroupFavoriteRequestDto): Observable<boolean> {
    return this.http
      .post<GroupFavoriteChangedResponseDto>(`${this.url}/set`, payload)
      .pipe(map(r => r.success));
  }

  /** POST /group/favorite/unset */
  unsetFavorite(payload: UnsetGroupFavoriteRequestDto): Observable<boolean> {
    return this.http
      .post<GroupFavoriteChangedResponseDto>(`${this.url}/unset`, payload)
      .pipe(map(r => r.success));
  }

  /** POST /group/favorite/list — returns actual GroupDto[] (not relationship rows) */
  listFavoriteGroupsByUser(payload: ListGroupFavoritesByUserRequestDto): Observable<GroupDto[]> {
    return this.http
      .post<GroupsResponseDto>(`${this.url}/list`, payload)
      .pipe(map(r => r.groups));
  }
}
