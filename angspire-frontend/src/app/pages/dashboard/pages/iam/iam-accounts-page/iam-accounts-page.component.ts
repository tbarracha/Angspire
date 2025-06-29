import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppUserDto } from '../../../../../features/iam/dtos/app-user-dto';
import { TableGridComponent } from '../../../../../shared/components/table-component/table-grid.component';
import { TableGridConfig } from '../../../../../shared/components/table-component/table-interfaaces';
import { IamServiceCollection } from '../../../../../features/iam/services/iam-service-collection';
import { Observable, of } from 'rxjs';

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
            class="bg-primary text-primary-contrast rounded px-4 py-2 font-bold hover:bg-primary/90 transition">Search</button>
          <button type="button"
            class="ml-2 bg-highlight text-card-contrast rounded px-3 py-2 font-semibold hover:bg-highlight/80 transition"
            (click)="clearSearch()" *ngIf="search.firstName || search.lastName">Clear</button>
        </form>
      </div>

      <!-- TableGrid -->
      <div class="flex-1 min-h-0 bg-card rounded-xl shadow overflow-auto">
        <app-table-grid
          [data]="displayRows"
          [config]="userGridConfig"
          [loading]="loading"
        ></app-table-grid>
      </div>
    </div>
  `
})
export class IamAccountsPageComponent implements OnInit {
  users: AppUserDto[] = [];
  displayRows: IamAccountRow[] = [];
  loading = false;
  error = false;

  page = 1;
  pageSize = 20;
  total = 0;
  totalPages = 1;

  search = { firstName: '', lastName: '' };

  deletingUserId: string | null = null;
  actionUserId: string | null = null;

  // RoleId to RoleName cache
  private roleNameMap = new Map<string, string>();

  userGridConfig: TableGridConfig<IamAccountRow> = {
    columns: [
      { field: 'firstName', label: 'First Name', sortable: true },
      { field: 'lastName', label: 'Last Name', sortable: true },
      { field: 'email', label: 'Email', sortable: true },
      { field: 'userName', label: 'Username', sortable: true },
      { field: 'primaryRoleName', label: 'Role', sortable: true }
    ],
    actions: [
      {
        label: 'View',
        colorClass: 'text-info hover:bg-info/25',
        callback: (user) => this.viewUser(user)
      },
      {
        label: 'Edit',
        colorClass: 'text-primary hover:bg-primary/25',
        callback: (user) => this.editUser(user)
      },
      {
        label: 'Delete',
        colorClass: 'text-error hover:bg-error/25',
        callback: (user) => this.deleteUser(user)
      }
    ],
    pageSizeOptions: [10, 20, 50],
    showVerticalLines: true,
  };

  constructor(
    private iamServiceCollection: IamServiceCollection
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = false;


    let search$: Observable<AppUserDto[] | { items: AppUserDto[] }>;

    if (this.search.firstName && this.search.lastName) {
      search$ = this.iamServiceCollection.accountService.searchByFullName(this.search.firstName, this.search.lastName);
    } else if (this.search.firstName) {
      search$ = this.iamServiceCollection.accountService.searchByFirstName(this.search.firstName);
    } else if (this.search.lastName) {
      search$ = this.iamServiceCollection.accountService.searchByLastName(this.search.lastName);
    } else {
      search$ = this.iamServiceCollection.accountService.getPaged(this.page, this.pageSize);
    }

    search$.subscribe({
      next: async (result: any) => {
        // Get array of users whether paged or not
        const users: AppUserDto[] = Array.isArray(result) ? result : result.items;
        this.users = users;
        await this.populateRoleNames(users);
        this.loading = false;
      },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  private async populateRoleNames(users: AppUserDto[]) {
    // Get all unique primaryRoleIds (ignore null/undefined)
    const uniqueRoleIds = Array.from(
      new Set(users.map(u => u.primaryRoleId).filter(id => !!id))
    );
    // Fetch and cache all missing role names
    await Promise.all(
      uniqueRoleIds.map(async roleId => {
        if (!this.roleNameMap.has(roleId!)) {
          const role = await this.iamServiceCollection.roleService.getCachedById(roleId!);
          if (role) {
            this.roleNameMap.set(roleId!, role.name);
          } else {
            const detailed = await this.iamServiceCollection.roleService.getCachedDetailedById(roleId!);
            if (detailed) {
              this.roleNameMap.set(roleId!, detailed.name);
            }
          }
        }
      })
    );
    // Map users to displayRows with role names
    this.displayRows = users.map(u => ({
      ...u,
      primaryRoleName:
        u.primaryRoleId && this.roleNameMap.has(u.primaryRoleId)
          ? this.roleNameMap.get(u.primaryRoleId)!
          : u.primaryRoleId // fallback: show id if name not found
    }));
  }

  onSearch() {
    this.page = 1;
    this.loadUsers();
  }

  clearSearch() {
    this.search = { firstName: '', lastName: '' };
    this.page = 1;
    this.loadUsers();
  }

  viewUser(user: IamAccountRow) {
    alert('View user: ' + user.userName);
  }
  editUser(user: IamAccountRow) {
    alert('Edit user: ' + user.userName);
  }
  deleteUser(user: IamAccountRow) {
    if (!confirm(`Delete user "${user.userName}"? This cannot be undone.`)) return;
    this.deletingUserId = user.id;
    this.iamServiceCollection.accountService.delete(user.id).subscribe({
      next: () => {
        this.deletingUserId = null;
        this.loadUsers();
      },
      error: () => {
        this.deletingUserId = null;
        alert('Failed to delete user.');
      }
    });
  }
}
