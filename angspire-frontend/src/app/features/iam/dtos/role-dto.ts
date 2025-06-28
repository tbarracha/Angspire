// Auto-generated from RoleDto.cs

import { PermissionDto } from "./permission-dto";

export interface RoleDto {
  id: string;
  name: string;
  groupId: null | string;
  permissions: PermissionDto[];
}

export interface RoleDetailedDto {
  id: string;
  name: string;
  description: string;
  groupId: null | string;
  groupName: null | string;
  permissions: PermissionDto[];
  createdAt: string;
  updatedAt: string;
  stateFlag: null | string;
}