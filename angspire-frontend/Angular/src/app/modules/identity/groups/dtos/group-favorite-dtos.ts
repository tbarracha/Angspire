// group-favorite-dtos.ts
import type { GroupDto, GroupsResponseDto } from './group-dtos'; // adjust path as needed

export interface SetGroupFavoriteRequestDto {
  userId: string;
  groupId: string;
}

export interface UnsetGroupFavoriteRequestDto {
  userId: string;
  groupId: string;
}

export interface ListGroupFavoritesByUserRequestDto {
  userId: string;
}

export interface GroupFavoriteDto {
  id: string;
  userId: string;
  groupId: string;
  favoritedAt: string; // ISO from DateTime
}

export interface GroupFavoritesResponseDto {
  favorites: GroupFavoriteDto[];
}

export interface GroupFavoriteChangedResponseDto {
  success: boolean;
}
