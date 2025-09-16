import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ButtonComponent } from "../../../lib/components/ui-primitives/button-directive.component";

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ButtonComponent],
  template: `
    <div class="flex h-full w-full bg-background">

      <!-- Left: Welcome Section -->
      <div class="w-2/5 flex flex-col text-foreground p-8">
        <!-- Top content -->
        <div class="flex-1 flex flex-col items-center justify-center gap-4">
          <img src="/angspire_icon_neg.png" alt="Angspire Logo" class="w-32 h-32 mb-4">
          <h1 class="text-4xl font-bold text-center">
            Welcome to <span>Angspire</span>
          </h1>
        </div>

        <!-- Bottom: Public link to Components page -->
        <div class="pt-6">
          <a routerLink="/components"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm">
            <app-button
              color="var(--color-accent)"
              contrastColor="#fff"
              [styleIdle]="'text'"
              [styleHover]="'filled'"
              [rounded]="'lg'"
            >
              Browse UI Components →
            </app-button>
          </a>
        </div>
      </div>

      <!-- Right: Routed Auth Content -->
      <div class="w-3/5 flex items-center justify-center p-8 bg-light">
        <div class="w-full max-w-md p-4 rounded-lg">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class AuthLayoutComponent {}
