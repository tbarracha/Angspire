// Auto-generated from GroupDto.cs

import { GroupTypeDto } from "./group-type-dto";
import { VisibilityDto } from "./visibility-dto";

export interface GroupDto {
  id: string;
  name: string;
  description: null | string;
  groupType: null | GroupTypeDto;
  visibility: null | VisibilityDto;
}