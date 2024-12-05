import { Component } from '@angular/core';
import { Theme, ThemeService } from './core/services/theme.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-angspire-home',
  template: `
<div class="h-screen w-screen flex flex-col bg-background text-background-contrast overflow-hidden">
  <!-- Header -->
  <div class="h-16 w-full flex flex-col shadow-md">

    <!-- Vertical-Main Section -->
    <div class="h-full flex-1 flex flex-row bg-header">
      <!-- Left Section: Logo -->
      <div class="flex flex-1 items-center pl-4">
        <a href="https://github.com/tbarracha/Angspire" target="_blank" rel="noopener noreferrer"
        class="h-[60%] aspect-auto">
          <img
            src="/angspire_icon_neg.png"
            alt="angspire_icon"
            class="h-full aspect-auto drop-shadow-lg"
          />
        </a>
      </div>
      <!-- Right Section: Theme Buttons -->
      <div class="flex items-center justify-end pr-4 bg-accent text-accent-contrast">
        <div class="h-full flex">
          <button
            *ngFor="let theme of availableThemes"
            (click)="applyTheme(theme.name)"
            class="h-full px-4
            hover:underline hover:bg-black hover:bg-opacity-30
            transition"
          >
            {{ theme.name }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="flex flex-col flex-1 overflow-hidden">
    <!-- Primary Section: Auth and Theme Testing -->
    <div class="h-full flex flex-1 flex-col sm:flex-row">
      <!-- Auth Section -->
      <div class="flex-1 flex justify-center items-center">
        <ng-container *ngTemplateOutlet="authSection"></ng-container>
      </div>

      <!-- Limited Theme Testing Section -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <h1 class="p-4 pt-8 text-2xl font-semibold text-center">
          Theme Samples
        </h1>

        <!-- Scrollable Content -->
        <div class="h-full flex flex-col overflow-y-auto">
          <ng-container *ngTemplateOutlet="themeTestingControls"></ng-container>
        </div>
      </div>

    </div>
  </div>

  <!-- Footer -->
  <footer class="h-6 w-full px-2 flex items-center justify-start bg-footer text-footer-contrast">
    <p class="text-sm flex items-center space-x-1">
      <span>Made with</span>
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"></path>
      </svg>
      <span>by</span>
      <a
        href="https://tiagobarracha.netlify.app"
        target="_blank"
        class="hover:text-accent underline"
      >
        Tiago Barracha
      </a>
    </p>
  </footer>

</div>


<!-- Auth Section -->
<ng-template #authSection>
  <div class="w-full max-w-sm mx-auto p-4 rounded-lg bg-highlight text-highlight-contrast border border-accent shadow-lg">
    <!-- Login State -->
    <div *ngIf="authState === 'login'">
      <h2 class="text-xl font-semibold mb-4">Login</h2>
      <form>
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            id="email"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Email"
          />
        </div>
        <div class="mb-4">
          <label for="password" class="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            id="password"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Password"
          />
        </div>
        <!-- Centered Login Button -->
        <div class="flex justify-center">
          <button
            type="button"
            class="px-4 py-2 rounded bg-accent text-highlight hover:underline"
            (click)="toggleAuthState('loggedIn')"
          >
            Login
          </button>
        </div>
        <div class="mt-4 text-center">
          <p>
            Don't have an account?
            <a
              href="#"
              class="text-accent hover:underline"
              (click)="toggleAuthState('register')"
            >
              Register
            </a>
          </p>
        </div>
      </form>
    </div>

    <!-- Register State -->
    <div *ngIf="authState === 'register'">
      <h2 class="text-xl font-semibold mb-4">Register</h2>
      <form>
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            id="email"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Email"
          />
        </div>
        <div class="mb-4">
          <label for="password" class="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            id="password"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Password"
          />
        </div>
        <div class="mb-4">
          <label for="confirm-password" class="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Confirm Password"
          />
        </div>
        <!-- Centered Register Button -->
        <div class="flex justify-center">
          <button
            type="button"
            class="px-4 py-2 rounded bg-accent text-highlight hover:underline"
            (click)="toggleAuthState('loggedIn')"
          >
            Register
          </button>
        </div>
        <div class="mt-4 text-center">
          <p>
            Already have an account?
            <a
              href="#"
              class="text-accent hover:underline"
              (click)="toggleAuthState('login')"
            >
              Login
            </a>
          </p>
        </div>
      </form>
    </div>

    <!-- Logged-In State -->
    <div *ngIf="authState === 'loggedIn'" class="text-center">
      <h2 class="text-xl font-semibold mb-4">Welcome</h2>
      <p class="mb-4">Logged in as {{ userEmail }}</p>
      <button
        class="px-4 py-2 rounded bg-accent text-highlight hover:underline"
        (click)="toggleAuthState('login')"
      >
        Logout
      </button>
    </div>
  </div>
</ng-template>


<!-- Theme Testing Templates -->
<ng-template #themeTestingControls>
  <div class="p-4 flex flex-col space-y-4">
    <!-- Outlined Buttons -->
    <div class="w-full flex flex-col space-y-2">
      <ng-container *ngTemplateOutlet="primaryButtonOutlined"></ng-container>
      <ng-container *ngTemplateOutlet="secondaryButtonOutlined"></ng-container>
      <ng-container *ngTemplateOutlet="highlightButtonOutlined"></ng-container>
      <ng-container *ngTemplateOutlet="accentButtonOutlined"></ng-container>
    </div>

    <!-- Inputs and Buttons -->
    <div class="w-full flex flex-col md:flex-row md:space-x-4">
      <!-- Inputs -->
      <div class="flex-1 flex flex-col space-y-2">
        <ng-container *ngTemplateOutlet="primaryInput"></ng-container>
        <ng-container *ngTemplateOutlet="highlightInput"></ng-container>
        <ng-container *ngTemplateOutlet="accentInput"></ng-container>
      </div>

      <!-- Filled Buttons -->
      <div class="min-w-16 flex flex-col space-y-2">
        <ng-container *ngTemplateOutlet="primaryButton"></ng-container>
        <ng-container *ngTemplateOutlet="secondaryButton"></ng-container>
        <ng-container *ngTemplateOutlet="accentButton"></ng-container>
      </div>
    </div>
  </div>
</ng-template>



<!-- Filled Buttons -->
<ng-template #primaryButton>
  <button class="bg-primary text-primary-contrast rounded hover:shadow-lg
  overflow-hidden transition duration-300">
    <div class="px-4 py-2 h-full w-full bg-black bg-opacity-0 hover:bg-opacity-20
    transition duration-300">
      Primary Button
    </div>
  </button>
</ng-template>

<ng-template #secondaryButton>
  <button class="bg-secondary text-secondary-contrast rounded hover:shadow-lg
  overflow-hidden transition duration-300">
    <div class="px-4 py-2 h-full w-full bg-black bg-opacity-0 hover:bg-opacity-20
    transition duration-300">
      Secondary Button
    </div>
  </button>
</ng-template>

<ng-template #highlightButton>
  <button class="bg-highlight text-highlight-contrast rounded hover:shadow-lg
  overflow-hidden transition duration-300">
    <div class="px-4 py-2 h-full w-full bg-black bg-opacity-0 hover:bg-opacity-20
    transition duration-300">
      Highlight Button
    </div>
  </button>
</ng-template>

<ng-template #accentButton>
  <button class="bg-accent text-accent-contrast rounded hover:shadow-lg
  overflow-hidden transition duration-300">
    <div class="px-4 py-2 h-full w-full bg-black bg-opacity-0 hover:bg-opacity-20
    transition duration-300">
      Accent Button
    </div>
  </button>
</ng-template>


<!-- Outlined Buttons -->
<ng-template #primaryButtonOutlined>
  <button class="px-4 py-2 border-2 border-primary text-primary rounded hover:shadow-lg hover:bg-primary hover:text-primary-contrast transition duration-300">
    Primary Button
  </button>
</ng-template>

<ng-template #secondaryButtonOutlined>
  <button class="px-4 py-2 border-2 border-secondary text-secondary rounded hover:shadow-lg hover:bg-secondary hover:text-secondary-contrast transition duration-300">
    Secondary Button
  </button>
</ng-template>

<ng-template #highlightButtonOutlined>
  <button class="px-4 py-2 border-2 border-highlight text-highlight rounded hover:shadow-lg hover:bg-highlight hover:text-highlight-contrast transition duration-300">
    Highlight Button
  </button>
</ng-template>

<ng-template #accentButtonOutlined>
  <button class="px-4 py-2 border-2 border-accent text-accent rounded hover:shadow-lg hover:bg-accent hover:text-highlight transition duration-300">
    Accent Button
  </button>
</ng-template>


<ng-template #primaryInput>
  <input
    type="text"
    class="w-full max-w-md p-3 rounded-md border border-primary text-text placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
    placeholder="Primary Input"
  />
</ng-template>

<ng-template #highlightInput>
  <input
    type="text"
    class="w-full max-w-md p-3 rounded-md border border-primary text-text bg-highlight placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
    placeholder="Highlight Input"
  />
</ng-template>

<ng-template #accentInput>
  <input
    type="text"
    class="w-full max-w-md p-3 rounded-md border border-primary text-text bg-accent placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
    placeholder="Accent Input"
  />
</ng-template>
  `,
  styles: [],
})
export class AngspireHome {
  authState: 'login' | 'register' | 'loggedIn' = 'login';
  userEmail = '';

  availableThemes: Theme[] = [];
  currentTheme!: Theme;

  constructor(private themeService: ThemeService) {

  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.availableThemes = this.themeService.getAllThemes();
      this.applyTheme(this.availableThemes[0].name);
    }, 100);
  }
  

  applyTheme(themeName: string): void {
    this.themeService.applyThemeByName(themeName);
  }

  toggleAuthState(state: 'login' | 'register' | 'loggedIn'): void {
    if (state === 'loggedIn') {
      this.userEmail = 'user@example.com'; // Simulate login
    } else {
      this.userEmail = '';
    }
    this.authState = state;
  }
}