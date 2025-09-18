import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { UiThemeDirective } from "../../../lib/modules/themes/theme.directive"; // adjust path

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, UiThemeDirective],
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
          <a
            routerLink="/components"
            uiTheme
            class="inline-flex items-center gap-2 text-sm select-none"
            [theme]="{
              idle: {
                colors: { bg: 'transparent', text: 'accent', border: { color: 'transparent' }, outline: { color: 'accent' } },
                corners: { radius: 'lg' },
                spacing: { padding: { x: '1rem', y: '0.5rem' } },
                interactions: { transition: { duration: 150, timing: 'ease-in-out' }, cursor: 'pointer' }
              },
              hover: {
                colors: { bg: 'accent', text: '#fff' },
                effects: { shadow: 'lg' }
              },
              focus: {
                outline: { width: '2px', offset: '2px' }
              }
            }"
          >
            Browse UI Components →
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
