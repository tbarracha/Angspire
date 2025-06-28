import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <h2 class="text-2xl font-bold">Welcome to Angspire ✨</h2>
        <p class="text-sm text-muted">Let’s get started with your projects.</p>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Create a Project</h3>
          <p class="text-sm">Start something new today.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">View Calendar</h3>
          <p class="text-sm">Check what’s coming up.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Customize Theme</h3>
          <p class="text-sm">Make it yours with a new color palette.</p>
        </div>
      </div>
    </div>
  `
})
export class HomePageComponent {}
