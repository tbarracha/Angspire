// group-type-dtos.ts

export interface GroupTypeDto {
  id: string;
  name: string;
  description?: string;
}

export interface CreateGroupTypeRequestDto {
  name: string;
  description?: string;
}

export interface GetGroupTypeRequestDto {
  id: string;
}

export interface GetGroupTypeByNameRequestDto {
  name: string;
}

export interface ListGroupTypesRequestDto {} // empty payload

export interface UpdateGroupTypeRequestDto {
  id: string;
  name?: string;
  description?: string;
}

export interface DeleteGroupTypeRequestDto {
  id: string;
}

export interface GroupTypeResponseDto {
  groupType: GroupTypeDto | null;
}

export interface GroupTypesResponseDto {
  groupTypes: GroupTypeDto[];
}

export interface DeleteGroupTypeResponseDto {
  success: boolean;
}
