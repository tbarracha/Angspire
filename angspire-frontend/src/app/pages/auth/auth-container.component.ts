import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-container',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="flex h-full w-full">

      <!-- Left: Welcome Section -->
      <div class="w-2/5 flex flex-col items-center justify-center bg-background-contrast text-background p-8 space-y-4">
        <a href="https://github.com/tbarracha/Angspire" target="_blank" rel="noopener noreferrer" class="h-24">
          <img src="/angspire_icon_neg.png" alt="angspire_icon" class="h-full aspect-auto drop-shadow-lg" />
        </a>
        <h1 class="text-4xl font-bold text-center">Welcome to Angspire</h1>
      </div>

      <!-- Right: Routed Auth Content -->
      <div class="w-3/5 flex items-center justify-center bg-highlight text-highlight-contrast p-8">
        <div class="w-full max-w-md p-6 rounded-lg border border-accent shadow-lg bg-highlight">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class AuthContainerComponent {}
