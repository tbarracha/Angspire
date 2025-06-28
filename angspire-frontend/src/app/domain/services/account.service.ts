// src/app/pages/iam/services/account.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppUserDetailedDto, AppUserDto } from '../dtos/Domain/app-user-dto';
import { RoleDto } from '../dtos/Domain/role-dto';
import { UpdateAppUserDetailsDto } from '../dtos/Domain/update-app-user-details-dto';
import { PaginatedResult } from '../../core/models/paginated-result';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/account`;

  // --- User Retrieval ---
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
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
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
}