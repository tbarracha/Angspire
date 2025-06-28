// account.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { AppUserDetailedDto, AppUserDto } from '../dtos/app-user-dto';
import { RoleDto } from '../dtos/role-dto';
import { UpdateAppUserDetailsDto } from '../dtos/update-app-user-details-dto';
import { PaginatedResult } from '../../../lib/models/paginated-result';
import { environment } from '../../../../environments/environment';
import { RecordMap } from '../../../lib/models/record-map';


@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/account`;

  private userCache = new RecordMap<string, AppUserDto>();
  private userDetailedCache = new RecordMap<string, AppUserDetailedDto>();

  constructor() {
    this.userCache.fetchIfStale = async (id: string) => {
      const user = await firstValueFrom(this.getById(id));
      return user ? AccountService.mapDetailedToDto(user) : null;
    };

    this.userDetailedCache.fetchIfStale = async (id: string) => {
      return await firstValueFrom(this.getById(id));
    };
  }


  // --- User Retrieval ---
  async getCachedById(id: string): Promise<AppUserDto | null> {
    return this.userCache.get(id);
  }

  async getCachedDetailedById(id: string): Promise<AppUserDetailedDto | null> {
    return this.userDetailedCache.get(id);
  }

  getById(id: string): Observable<AppUserDetailedDto> {
    return this.http.get<AppUserDetailedDto>(`${this.baseUrl}/${id}`);
  }

  getByEmail(email: string): Observable<AppUserDetailedDto> {
    return this.http.get<AppUserDetailedDto>(`${this.baseUrl}/by-email`, {
      params: { email }
    });
  }

  getPaged(page = 1, pageSize = 20): Observable<PaginatedResult<AppUserDto>> {
    return this.http.get<PaginatedResult<AppUserDto>>(this.baseUrl, {
      params: { page, pageSize }
    });
  }


  // --- User Search ---
  searchByFirstName(firstName: string): Observable<AppUserDto[]> {
    return this.http.get<AppUserDto[]>(`${this.baseUrl}/search/first-name/${firstName}`);
  }

  searchByLastName(lastName: string): Observable<AppUserDto[]> {
    return this.http.get<AppUserDto[]>(`${this.baseUrl}/search/last-name/${lastName}`);
  }

  searchByFullName(firstName: string, lastName: string): Observable<AppUserDto[]> {
    return this.http.get<AppUserDto[]>(`${this.baseUrl}/search/full-name`, {
      params: { firstName, lastName }
    });
  }


  // --- User Lifecycle ---
  create(dto: {
    email: string;
    userName: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Observable<AppUserDetailedDto> {
    return this.http.post<AppUserDetailedDto>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateAppUserDetailsDto): Observable<AppUserDetailedDto> {
    return this.http.put<AppUserDetailedDto>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.userCache.delete(id);
        this.userDetailedCache.delete(id);
      })
    );
  }


  // --- Credentials and Security ---
  changePassword(dto: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, dto);
  }

  changeEmail(dto: { userId: string; newEmail: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-email`, dto);
  }

  lockUser(dto: { userId: string; reason?: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/lock`, dto);
  }

  unlockUser(userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/unlock/${userId}`, {});
  }

  // --- Email Confirmation & Reset ---
  sendConfirmation(userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/send-confirmation/${userId}`, {});
  }

  resendConfirmation(userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/resend-confirmation/${userId}`, {});
  }

  confirmEmail(dto: { userId: string; confirmationToken: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/confirm-email`, dto);
  }

  generateResetToken(userId: string): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/generate-reset-token/${userId}`, {});
  }

  resetPassword(dto: {
    userId: string;
    resetToken: string;
    newPassword: string;
  }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, dto);
  }


  // --- Primary Role ---
  getPrimaryRole(userId: string): Observable<RoleDto> {
    return this.http.get<RoleDto>(`${this.baseUrl}/${userId}/primary-role`);
  }

  setPrimaryRole(dto: { userId: string; primaryRoleId?: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/set-primary-role`, dto);
  }


  // --- User Mapping ---
  static mapDetailedToDto(user: AppUserDetailedDto): AppUserDto {
    return {
      id: user.id,
      userName: user.userName,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      primaryRoleId: user.primaryRoleId,
    };
  }

  static mapDtoToDetailed(user: AppUserDto): AppUserDetailedDto {
    return {
      id: user.id,
      userName: user.userName,
      email: user.email,
      phoneNumber: null,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: null,
      primaryRoleId: user.primaryRoleId,
      userGroupIds: [],
      userRoleIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stateFlag: null,
      lastLoginAt: null,
      isInitialPasswordChanged: false
    };
  }
}