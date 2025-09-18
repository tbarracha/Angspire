// pages/users-admin-page.component.ts
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users-admin-page',
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="p-6">
    <header class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Users</h2>
      <div class="flex gap-2">
        <button class="btn btn-secondary">Invite</button>
        <button class="btn btn-primary">Create</button>
      </div>
    </header>
    <div class="text-sm text-tertiary">Users grid goes here…</div>
  </section>
  `
})
export class UsersAdminPageComponent {}
