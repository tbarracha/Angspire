import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-iam-home-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <h2 class="text-2xl font-bold">Identity & Access Management 🔐</h2>
        <p class="text-sm text-secondary">Manage users, roles, permissions, and group access.</p>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Manage Users</h3>
          <p class="text-sm">View and edit registered users.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Assign Roles</h3>
          <p class="text-sm">Control access with role assignments.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Set Permissions</h3>
          <p class="text-sm">Customize what users can do.</p>
        </div>
      </div>
    </div>
  `
})
export class IamHomePageComponent {}
