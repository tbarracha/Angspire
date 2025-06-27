import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-theme-home-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <h2 class="text-2xl font-bold">Theme Customization 🎨</h2>
        <p class="text-sm text-muted">Create, edit, and preview UI themes to personalize your experience.</p>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Create Theme</h3>
          <p class="text-sm">Design a new theme with custom colors and fonts.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Preview Themes</h3>
          <p class="text-sm">See how your UI looks with different configurations.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Manage Saved Themes</h3>
          <p class="text-sm">Edit or delete existing themes.</p>
        </div>
      </div>
    </div>
  `
})
export class ThemeHomePageComponent {}
