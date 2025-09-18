// group-role-dtos.ts

export interface GroupRoleDto {
  id: string;
  groupId?: string;
  name: string;
  description?: string;
}

export interface CreateGroupRoleRequestDto {
  groupId?: string;
  name: string;
  description?: string;
}

export interface GetGroupRoleRequestDto {
  id: string;
}

export interface ListGroupRolesRequestDto {
  groupId?: string;
}

export interface UpdateGroupRoleRequestDto {
  id: string;
  name?: string;
  description?: string;
}

export interface DeleteGroupRoleRequestDto {
  id: string;
}

export interface GroupRoleResponseDto {
  role: GroupRoleDto | null;
}

export interface GroupRolesResponseDto {
  roles: GroupRoleDto[];
}

export interface DeleteGroupRoleResponseDto {
  success: boolean;
}
