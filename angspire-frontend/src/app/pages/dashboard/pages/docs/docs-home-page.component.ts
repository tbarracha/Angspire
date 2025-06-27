import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-docs-home-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <h2 class="text-2xl font-bold">Documentation 📚</h2>
        <p class="text-sm text-muted">Browse and manage internal or public-facing docs.</p>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">All Docs</h3>
          <p class="text-sm">Browse all documentation pages.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Create New</h3>
          <p class="text-sm">Start a new document.</p>
        </div>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition">
          <h3 class="font-semibold text-lg mb-2">Recent Updates</h3>
          <p class="text-sm">See what’s changed recently.</p>
        </div>
      </div>
    </div>
  `
})
export class DocsHomePageComponent {}
