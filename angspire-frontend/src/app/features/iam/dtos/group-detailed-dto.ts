// Auto-generated from GroupDetailedDto.cs

import { GroupTypeDto } from "./group-type-dto";
import { VisibilityDto } from "./visibility-dto";

export interface GroupDetailedDto {
  id: string;
  name: string;
  description: null | string;
  groupType: null | GroupTypeDto;
  visibility: null | VisibilityDto;
  parentGroupId: null | string;
  parentGroupName: null | string;
  subGroupIds: string[];
  userGroupIds: string[];
  roleIds: string[];
  userGroupRoleIds: string[];
  createdAt: string;
  updatedAt: string;
  stateFlag: null | string;
}