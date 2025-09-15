// group-dtos.ts

export interface GroupDto {
  id: string;
  name: string;
  groupTypeId: string;
  ownerUserId?: string;
  description?: string;
  parentGroupId?: string;
  metadata?: Record<string, any>;
}

export interface CreateGroupRequestDto {
  name: string;
  groupTypeId: string;
  ownerUserId?: string;
  description?: string;
  parentGroupId?: string;
  metadata?: Record<string, any>;
}

export interface GetGroupRequestDto {
  id: string;
}

export interface ListGroupsRequestDto {
  userId: string;

  // Optional filters
  groupTypeId?: string;
  roleId?: string;
  roleName?: string;
  isGroupOwner?: boolean;
}

export interface UpdateGroupRequestDto {
  id: string;
  name?: string;
  groupTypeId?: string;
  ownerUserId?: string;
  description?: string;
  parentGroupId?: string;
  metadata?: Record<string, any>;
}

export interface DeleteGroupRequestDto {
  id: string;
}

export interface GroupResponseDto {
  group: GroupDto | null;
}

export interface GroupsResponseDto {
  groups: GroupDto[];
}

export interface DeleteGroupResponseDto {
  success: boolean;
}
