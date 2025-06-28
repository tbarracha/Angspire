// iam-service-collection.ts

import { inject, Injectable } from '@angular/core';
import { AccountService } from './account.service';
import { GroupService } from './group.service';
import { PermissionService } from './permission.service';
import { RoleService } from './role.service';
import { RolePermissionService } from './role-permission.service';
import { VisibilityService } from './visibility.service';

@Injectable({ providedIn: 'root' })
export class IamServiceCollection {
  readonly accountService = inject(AccountService);
  readonly groupService = inject(GroupService);
  readonly permissionService = inject(PermissionService);
  readonly roleService = inject(RoleService);
  readonly rolePermissionService = inject(RolePermissionService);
  readonly visibilityService = inject(VisibilityService);

  constructor() {
  }
}