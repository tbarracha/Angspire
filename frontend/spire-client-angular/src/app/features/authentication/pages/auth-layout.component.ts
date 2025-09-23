import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="flex h-full w-full bg-neutral">

      <!-- Left: Welcome Section -->
      <div class="w-2/5 flex flex-col text-base-100 p-8">
        <!-- Top content -->
        <div class="flex-1 flex flex-col items-center justify-center gap-4">
          <img src="/angspire_icon_neg.png" alt="Angspire Logo" class="w-32 h-32 mb-4">
          <h1 class="text-4xl font-bold text-center">
            Welcome to <span>Angspire</span>
          </h1>
        </div>
      </div>

      <!-- Right: Routed Auth Content -->
      <div class="w-3/5 flex items-center justify-center p-8 bg-base-100">
        <div class="w-full max-w-md p-4 rounded-lg">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class AuthLayoutComponent {}
