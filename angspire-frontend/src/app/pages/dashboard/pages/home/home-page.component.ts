import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <h2 class="text-2xl font-bold">Welcome to Angspire ✨</h2>
        <p class="text-sm text-muted">Let’s get started with your projects.</p>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          routerLink="/home/todo"
          class="block bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md hover:ring-2 hover:ring-primary/20 transition"
        >
          <h3 class="font-semibold text-lg mb-2 flex items-center gap-2">
            📝 To-Do List
          </h3>
          <p class="text-sm">Organize your daily tasks and stay productive.</p>
        </a>
        <a
          routerLink="/home/bubble-pop"
          class="block bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md hover:ring-2 hover:ring-primary/20 transition"
        >
          <h3 class="font-semibold text-lg mb-2 flex items-center gap-2">
            🔵 Bubble Pop
          </h3>
          <p class="text-sm">A fun game to take a break!</p>
        </a>
        <div class="bg-card text-card-contrast p-4 rounded-xl shadow hover:shadow-md transition opacity-60 pointer-events-none">
          <h3 class="font-semibold text-lg mb-2 flex items-center gap-2">
            🚧 More Coming Soon
          </h3>
          <p class="text-sm">Stay tuned for new features and games.</p>
        </div>
      </div>
    </div>
  `
})
export class HomePageComponent {}
