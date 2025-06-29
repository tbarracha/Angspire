import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppUserDto } from '../../../../../features/iam/dtos/app-user-dto';
import {
  TableGridComponent,
  TableGridConfig,
} from '../../../../../shared/components/table-component/table-grid.component';
import { IamServiceCollection } from '../../../../../features/iam/services/iam-service-collection';
import { Observable } from 'rxjs';

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
          <input
            [(ngModel)]="search.firstName"
            name="firstName"
            class="rounded px-3 py-2 border border-input bg-input-background text-input-text w-36"
            placeholder="First Name"
            autocomplete="off" />
          <input
            [(ngModel)]="search.lastName"
            name="lastName"
            class="rounded px-3 py-2 border border-input bg-input-background text-input-text w-36"
            placeholder="Last Name"
            autocomplete="off" />
          <button
            type="submit"
            class="bg-primary text-primary-contrast rounded px-4 py-2 font-bold hover:bg-primary/90 transition">
            Search
          </button>
          <button
            *ngIf="search.firstName || search.lastName"
            type="button"
            class="ml-2 bg-highlight text-card-contrast rounded px-3 py-2 font-semibold hover:bg-highlight/80 transition"
            (click)="clearSearch()">
            Clear
          </button>
        </form>
      </div>

      <!-- TableGrid -->
      <div class="flex-1 min-h-0 bg-card rounded-xl shadow overflow-auto">
        <app-table-grid
          [data]="displayRows"
          [config]="userGridConfig"
          [loading]="loading"
          (refresh)="loadUsers()"
          (pageRequest)="onPageRequest($event)"
        ></app-table-grid>
      </div>
    </div>
  `
})
export class IamAccountsPageComponent implements OnInit {
  displayRows: IamAccountRow[] = [];
  loading = false;
  error = false;

  page: number = 1;
  pageSize: number = 10;
  total: number = 0;

  search = { firstName: '', lastName: '' };
  private roleNameMap = new Map<string, string>();

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
      width: '120',
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
    pageSizeOptions: [this.pageSize, 20, 50],
    showVerticalLines: true
  };

  constructor(private iamServiceCollection: IamServiceCollection) { }

  ngOnInit() {
    this.loadUsers();
  }

  onPageRequest({ page, pageSize }: { page: number; pageSize: number }) {
    // avoid duplicate fetches when nothing changed
    const changed = (this.page !== page) || (this.pageSize !== pageSize);
    this.page = page;
    this.pageSize = pageSize;
    if (changed) this.loadUsers();
  }


  loadUsers(): void {
    this.loading = true;
    this.error = false;

    // 1️⃣ server-side paging
    if (!this.search.firstName && !this.search.lastName) {
      this.iamServiceCollection.accountService
        .getPaged(this.page, this.pageSize)
        .subscribe({
          next: async result => {
            this.total = result.totalCount;            // <-- keep footer correct
            await this.populateRoleNames(result.items);
            this.loading = false;
          },
          error: () => { this.error = true; this.loading = false; }
        });
      return;
    }

    // 2️⃣ search (still client-side)
    this.getSearchObservable().subscribe({
      next: async users => {
        this.total = users.length;
        await this.populateRoleNames(users);
        this.loading = false;
      },
      error: () => { this.error = true; this.loading = false; }
    });
  }



  private getSearchObservable(): Observable<AppUserDto[]> {
    const { firstName, lastName } = this.search;
    if (firstName && lastName) {
      return this.iamServiceCollection.accountService.searchByFullName(firstName, lastName);
    } else if (firstName) {
      return this.iamServiceCollection.accountService.searchByFirstName(firstName);
    } else {
      return this.iamServiceCollection.accountService.searchByLastName(lastName);
    }
  }


  private async populateRoleNames(users: AppUserDto[]) {
    const uniqueRoleIds = Array.from(
      new Set(users.map(u => u.primaryRoleId).filter(id => !!id))
    );
    await Promise.all(
      uniqueRoleIds.map(async roleId => {
        if (!this.roleNameMap.has(roleId!)) {
          const r = await this.iamServiceCollection.roleService.getCachedById(roleId!);
          this.roleNameMap.set(roleId!, r?.name ?? (await this.iamServiceCollection.roleService.getCachedDetailedById(roleId!))?.name ?? '');
        }
      })
    );
    this.displayRows = users.map(u => ({
      ...u,
      primaryRoleName:
        u.primaryRoleId && this.roleNameMap.has(u.primaryRoleId)
          ? this.roleNameMap.get(u.primaryRoleId)!
          : null
    }));
  }

  onSearch() {
    this.loadUsers();
  }

  clearSearch() {
    this.search = { firstName: '', lastName: '' };
    this.loadUsers();
  }

  viewUser(user: IamAccountRow) {
    alert(`View user: ${user.userName}`);
  }

  editUser(user: IamAccountRow) {
    alert(`Edit user: ${user.userName}`);
  }

  deleteUser(user: IamAccountRow) {
    if (!confirm(`Delete user "${user.userName}"? This cannot be undone.`)) {
      return;
    }
    this.iamServiceCollection.accountService.delete(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Failed to delete user.')
    });
  }
}
