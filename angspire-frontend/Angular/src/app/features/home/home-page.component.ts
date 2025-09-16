import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GreetComponent } from '../../modules/identity/greet/greet.component';

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [CommonModule, RouterLink, GreetComponent],
  template: `
    <main class="p-6 md:p-10 max-w-5xl mx-auto">
      <app-greet />

      <section class="mt-6 grid gap-4">
        <div class="rounded-2xl border p-6">
          <h3 class="text-lg font-semibold mb-2">Quick links</h3>
          <div class="flex flex-wrap gap-3">
            <a routerLink="/components" class="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm">Components Gallery</a>
            <a routerLink="/login" class="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm">Login</a>
            <a routerLink="/register" class="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm">Register</a>
          </div>
        </div>
      </section>
    </main>
  `
})
export class HomePageComponent {}
