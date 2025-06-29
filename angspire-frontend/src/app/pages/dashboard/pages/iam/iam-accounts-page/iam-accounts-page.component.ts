import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { AppUserDto } from '../../../../../features/iam/dtos/app-user-dto';
import {
  TableGridComponent,
  TableGridConfig,
} from '../../../../../shared/components/table-component/table-grid.component';
import { IamServiceCollection } from '../../../../../features/iam/services/iam-service-collection';

export interface IamAccountRow extends AppUserDto {
  primaryRoleName: string | null;
}

@Component({
  selector: 'app-iam-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TableGridComponent],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header + Actions -->
      <div class="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div class="flex-1">
          <h2 class="text-2xl font-bold">Accounts</h2>
          <p class="text-sm text-secondary">View and manage all users in your IAM system.</p>
        </div>

        <!-- Search -->
        <form class="flex gap-2" (submit)="onSearch(); $event.preventDefault()">
          <input [(ngModel)]="search.firstName" name="firstName"
                 class="rounded px-3 py-2 border border-input bg-input-background text-input-text w-36"
                 placeholder="First Name" autocomplete="off" />
          <input [(ngModel)]="search.lastName" name="lastName"
                 class="rounded px-3 py-2 border border-input bg-input-background text-input-text w-36"
                 placeholder="Last Name" autocomplete="off" />
          <button type="submit"
                  class="bg-primary text-primary-contrast rounded px-4 py-2 font-bold hover:bg-primary/90 transition">
            Search
          </button>
          <button *ngIf="search.firstName || search.lastName" type="button"
                  class="ml-2 bg-highlight text-card-contrast rounded px-3 py-2 font-semibold hover:bg-highlight/80 transition"
                  (click)="clearSearch()">
            Clear
          </button>
        </form>
      </div>

      <!-- Table -->
      <div class="flex-1 min-h-0 bg-card rounded-xl shadow overflow-auto">
        <app-table-grid
          [config]="userGridConfig">
        </app-table-grid>
      </div>
    </div>
  `
})
export class IamAccountsPageComponent implements OnInit {
  loading = true;

  search = { firstName: '', lastName: '' };
  private roleNameMap = new Map<string, string>();

  constructor(public iamServiceCollection: IamServiceCollection) { }

  ngOnInit(): void {
    // no need to trigger anything — grid will call fetchPage/fetchAll automatically
  }

  /** Populate `primaryRoleName` into AppUserDto list */
  private async enrichUsers(users: AppUserDto[]): Promise<IamAccountRow[]> {
    const roleIds = Array.from(new Set(users.map(u => u.primaryRoleId).filter(Boolean)));
    await Promise.all(roleIds.map(async id => {
      if (!this.roleNameMap.has(id!)) {
        const role = await this.iamServiceCollection.roleService.getCachedById(id!);
        const detailed = await this.iamServiceCollection.roleService.getCachedDetailedById(id!);
        this.roleNameMap.set(id!, role?.name ?? detailed?.name ?? '');
      }
    }));
    return users.map(u => ({
      ...u,
      primaryRoleName: u.primaryRoleId ? this.roleNameMap.get(u.primaryRoleId)! : null
    }));
  }

  userGridConfig: TableGridConfig<IamAccountRow> = {
    columns: [
      { field: 'firstName', label: 'First Name', sortable: true },
      { field: 'lastName', label: 'Last Name', sortable: true },
      { field: 'email', label: 'Email', sortable: true },
      { field: 'userName', label: 'Username', sortable: true },
      { field: 'primaryRoleName', label: 'Role', sortable: true }
    ],
    actions: {
      label: 'Actions',
      width: '120px',
      actions: [
        {
          label: 'View',
          colorClass: 'text-info hover:bg-info/25',
          callback: user => this.viewUser(user)
        },
        {
          label: 'Edit',
          colorClass: 'text-primary hover:bg-primary/25',
          callback: user => this.editUser(user)
        },
        {
          label: 'Delete',
          colorClass: 'text-error hover:bg-error/25',
          callback: user => this.deleteUser(user)
        }
      ]
    },
    pageSizeOptions: [10, 20, 50],
    showVerticalLines: true,

    fetchPage: ({ page, pageSize, sortColumn, sortDir }) => {
      this.loading = true;
      return this.iamServiceCollection.accountService
        .getPaged(page, pageSize)
        .pipe(
          switchMap(result =>
            from(this.enrichUsers(result.items)).pipe(
              map(enriched => ({
                items: enriched,
                totalCount: result.totalCount,
                page,
                pageSize
              }))
            )
          ),
          map(res => {
            setTimeout(() => this.loading = false, 0);
            return res;
          })
        );
    },

    fetchAll: () => {
      const obs = this.getSearchObservable();
      this.loading = true;
      return obs.pipe(
        switchMap(users =>
          from(this.enrichUsers(users)).pipe(
            map(rows => {
              this.loading = false;
              return rows;
            })
          )
        )
      );
    },

    onRefresh: () => {
      this.loading = true;
    },

    storageKey: 'iam-accounts-column-widths',
  };


  /** Search field → appropriate observable */
  private getSearchObservable(): Observable<AppUserDto[]> {
    const { firstName, lastName } = this.search;
    if (firstName && lastName)
      return this.iamServiceCollection.accountService.searchByFullName(firstName, lastName);
    if (firstName)
      return this.iamServiceCollection.accountService.searchByFirstName(firstName);
    return this.iamServiceCollection.accountService.searchByLastName(lastName);
  }

  onSearch() {
    this.loading = true;
  }

  clearSearch() {
    this.search = { firstName: '', lastName: '' };
    this.loading = true;
  }

  viewUser(user: IamAccountRow) {
    alert(`View user: ${user.userName}`);
  }

  editUser(user: IamAccountRow) {
    alert(`Edit user: ${user.userName}`);
  }

  deleteUser(user: IamAccountRow) {
    if (!confirm(`Delete user "${user.userName}"? This cannot be undone.`)) return;
    this.iamServiceCollection.accountService.delete(user.id).subscribe({
      next: () => this.loading = true,
      error: () => alert('Failed to delete user.')
    });
  }
}
