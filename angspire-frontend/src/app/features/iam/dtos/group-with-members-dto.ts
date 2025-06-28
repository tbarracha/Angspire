// Auto-generated from GroupWithMembersDto.cs

import { AppUserDto } from "./app-user-dto";
import { GroupTypeDto } from "./group-type-dto";

export interface GroupWithMembersDto {
  id: string;
  name: string;
  description: null | string;
  groupType: null | GroupTypeDto;
  members: AppUserDto[];
}