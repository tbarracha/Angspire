// Auto-generated from AppUserDto.cs

export interface AppUserDto {
  id: string;
  userName: null | string;
  email: null | string;
  firstName: string;
  lastName: string;
  primaryRoleId: null | string;
}

export interface AppUserDetailedDto {
  id: string;
  userName: null | string;
  email: null | string;
  phoneNumber: null | string;
  firstName: string;
  lastName: string;
  dateOfBirth: null | string;
  primaryRoleId: null | string;
  userGroupIds: string[];
  userRoleIds: string[];
  createdAt: string;
  updatedAt: string;
  stateFlag: null | string;
  lastLoginAt: null | string;
  isInitialPasswordChanged: boolean;
}