import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGridComponent, TableGridConfig } from '../../../../../shared/components/table-component/table-grid.component';
import { AppUserDto } from '../../../../../features/iam/dtos/app-user-dto';
import { IamServiceCollection } from '../../../../../features/iam/services/iam-service-collection';
import { map } from 'rxjs';
import { ModalComponent } from "../../../../../shared/components/modal-components/modal.component";
import { AccountService } from '../../../../../features/iam/services/account.service';
import { ConfirmationModalComponent } from '../../../../../shared/components/modal-components/confirmation-modal.component';
import { UpdateAppUserDetailsDto } from '../../../../../features/iam/dtos/update-app-user-details-dto';

export interface IamAccountRow extends AppUserDto {
  primaryRoleName: string | null;
}

@Component({
  selector: 'app-iam-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TableGridComponent, ModalComponent, ConfirmationModalComponent],
  template: `
    <div class="flex flex-col h-full">
      <div class="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div class="flex-1">
          <h2 class="text-2xl font-bold">Accounts</h2>
          <p class="text-sm text-secondary">View and manage all users in your IAM system.</p>
        </div>

        <form class="flex gap-2" (submit)="onSearch(); $event.preventDefault()">
          <input [(ngModel)]="search.firstName" name="firstName" placeholder="First Name"
                 class="rounded px-3 py-2 border border-input bg-input-background text-input-text w-36" />
          <input [(ngModel)]="search.lastName" name="lastName" placeholder="Last Name"
                 class="rounded px-3 py-2 border border-input bg-input-background text-input-text w-36" />
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

      <div class="flex-1 min-h-0 bg-card rounded-xl shadow overflow-auto">
        <app-table-grid
          [config]="userGridConfig"
          [data]="visibleData"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          (refresh)="refreshData()"
          (pageRequest)="onPageRequest($event)">
        </app-table-grid>
      </div>

      <!-- Modal Invocation -->
      <app-modal
        [isOpen]="showUserModal"
        [title]="'Edit User: ' + modalUser?.userName"
        (cancel)="onModalCancel()"
        (submit)="onModalSubmit()"
      >
        <!-- Project whatever form or content you need: -->
        <form *ngIf="modalUser" #modalForm="ngForm" class="space-y-4">
          <div>
            <label class="block text-sm">First Name</label>
            <input
              [(ngModel)]="modalUser!.firstName"
              name="firstName"
              required
              class="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label class="block text-sm">Last Name</label>
            <input
              [(ngModel)]="modalUser!.lastName"
              name="lastName"
              required
              class="w-full border rounded px-2 py-1"
            />
          </div>
        </form>

        <app-confirmation-modal
          [isOpen]="showConfirmModal"
          [title]="'Confirm Update'"
          [message]="'Are you sure you want to apply changes to this user?'"
          [confirmText]="'Yes, update'"
          [cancelText]="'Cancel'"
          (confirm)="onConfirmUpdate()"
          (cancel)="onCancelUpdate()"
        />
      </app-modal>

      <app-confirmation-modal
        [isOpen]="showDeleteConfirmModal"
        [title]="'Confirm Deletion'"
        [message]="'Are you sure you want to delete user ' + pendingDeleteUser?.userName + '?'"
        [confirmText]="'Yes, delete'"
        [cancelText]="'Cancel'"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()"
      />
    </div>
  `
})
export class IamAccountsPageComponent implements OnInit {
  loading = true;
  search = { firstName: '', lastName: '' };

  users: IamAccountRow[] = [];
  visibleData: IamAccountRow[] = [];

  page = 1;
  pageSize = 20;
  total = 0;

  // Modal state
  showUserModal = false;
  modalUser?: IamAccountRow;
  showConfirmModal = false;
  pendingUpdateDto: UpdateAppUserDetailsDto | null = null;

  showDeleteConfirmModal = false;
  pendingDeleteUser?: IamAccountRow;


  private roleNameMap = new Map<string, string>();

  constructor(public iamServiceCollection: IamServiceCollection) { }

  ngOnInit(): void {
    this.refreshData();
  }

  userGridConfig: TableGridConfig<IamAccountRow> = {
    columns: [
      { field: 'firstName', label: 'First Name', sortable: true, width: '200px' },
      { field: 'lastName', label: 'Last Name', sortable: true, width: '200px' },
      { field: 'email', label: 'Email', sortable: true },
      { field: 'userName', label: 'Username', sortable: true },
      { field: 'primaryRoleId', label: 'Role ID', hidden: true, sortable: true, width: '120px' },
      { field: 'primaryRoleName', label: 'Role', sortable: true, width: '96px' },
    ],
    actions: {
      label: 'Actions',
      width: '192px',
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
    showHorizontalLines: true,
  };

  onPageRequest(e: { page: number; pageSize: number }) {
    this.page = e.page;
    this.pageSize = e.pageSize;
    this.refreshVisibleData();
  }

  onSearch() {
    this.page = 1;
    this.refreshData();
  }

  clearSearch() {
    this.search = { firstName: '', lastName: '' };
    this.page = 1;
    this.refreshData();
  }

  refreshData() {
    this.loading = true;
    this.getSearchObservable().subscribe({
      next: async (users: AppUserDto[]) => {
        this.users = await this.enrichUsers(users);
        this.total = this.users.length;
        this.refreshVisibleData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  refreshVisibleData() {
    const start = (this.page - 1) * this.pageSize;
    const end = this.page * this.pageSize;
    this.visibleData = this.users.slice(start, end);
  }

  private getSearchObservable() {
    const { firstName, lastName } = this.search;

    if (firstName && lastName)
      return this.iamServiceCollection.accountService.searchByFullName(firstName, lastName);

    if (firstName)
      return this.iamServiceCollection.accountService.searchByFirstName(firstName.trim());

    if (lastName)
      return this.iamServiceCollection.accountService.searchByLastName(lastName.trim());

    // Fallback: simulate "getAll" by requesting a large page
    return this.iamServiceCollection.accountService.getPaged(1, 500).pipe(
      map(result => result.items)
    );
  }

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

  viewUser(user: IamAccountRow) {
    alert(`View user: ${user.userName}`);
  }

  editUser(user: IamAccountRow) {
    this.modalUser = { ...user };
    this.showUserModal = true;
  }

  deleteUser(user: IamAccountRow) {
    this.pendingDeleteUser = user;
    this.showDeleteConfirmModal = true;
  }

  onConfirmDelete() {
    if (!this.pendingDeleteUser) return;

    this.iamServiceCollection.accountService.delete(this.pendingDeleteUser.id).subscribe({
      next: () => {
        this.showDeleteConfirmModal = false;
        this.pendingDeleteUser = undefined;
        this.refreshData();
      },
      error: () => {
        this.showDeleteConfirmModal = false;
        alert('Failed to delete user.');
      }
    });
  }

  onCancelDelete() {
    this.showDeleteConfirmModal = false;
    this.pendingDeleteUser = undefined;
  }

  onModalCancel() {
    this.showUserModal = false;
  }

  onModalSubmit() {
    if (!this.modalUser) return;

    this.pendingUpdateDto = AccountService.mapDtoToUpdateDto(this.modalUser);
    this.showConfirmModal = true;
  }


  onConfirmUpdate() {
    if (!this.pendingUpdateDto) return;

    this.iamServiceCollection.accountService
      .update(this.pendingUpdateDto.id, this.pendingUpdateDto)
      .subscribe({
        next: () => {
          this.showUserModal = false;
          this.showConfirmModal = false;
          this.pendingUpdateDto = null;
          this.refreshData();
        },
        error: () => alert('Update failed'),
      });
  }

  onCancelUpdate() {
    this.showConfirmModal = false;
    this.pendingUpdateDto = null;
  }

}


