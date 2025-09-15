// group-membership-dtos.ts

export interface AddGroupMemberRequestDto {
  groupId: string;
  userId: string;
  roleId?: string;
  state?: string;
  isGroupOwner: boolean; // default handled server-side if omitted by caller
}

export interface RemoveGroupMemberRequestDto {
  groupId: string;
  userId: string;
}

export interface AddMemberRoleRequestDto {
  groupId: string;
  userId: string;
  roleId: string;
}

export interface RemoveMemberRoleRequestDto {
  groupId: string;
  userId: string;
}

export interface ListGroupMembersRequestDto {
  // Filter by group
  groupId?: string;
  groupName?: string;

  // Filter by role
  roleId?: string;
  roleName?: string;

  // Optional: filter owners
  isGroupOwner?: boolean;
}

export interface GroupMemberDto {
  groupId: string;
  userId: string;
  roleId?: string;
  roleName?: string;
  state?: string;
  isGroupOwner: boolean;
}

export interface GroupMembersResponseDto {
  members: GroupMemberDto[];
}

/** Returned by all add/remove/set/revoke ops in this script */
export interface OperationSuccessResponseDto {
  success: boolean;
}
