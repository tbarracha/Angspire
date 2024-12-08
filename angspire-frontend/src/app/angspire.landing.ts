import { Component } from '@angular/core';
import { Theme, ThemeService } from './core/services/theme.service';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControlOptions, ValidatorFn } from '@angular/forms';
import { AuthResponseModel } from './core/authentication/models/auth-response-model';
import { AuthRegisterModel } from './core/authentication/models/auth-register-model';
import { AuthLoginModel } from './core/authentication/models/auth-login-model';
import { AuthService } from './core/authentication/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  selector: 'app-angspire-home',
  template: `
<div class="h-screen w-screen flex flex-col bg-background text-background-contrast overflow-hidden">
  <!-- Header -->
  <div class="h-16 w-full flex flex-col shadow-md">
    <div class="h-full flex-1 flex flex-row bg-header">
      <!-- Left: Logo -->
      <div class="flex flex-1 items-center pl-4">
        <a href="https://github.com/tbarracha/Angspire" target="_blank" rel="noopener noreferrer" class="h-[60%] aspect-auto">
          <img src="/angspire_icon_neg.png" alt="angspire_icon" class="h-full aspect-auto drop-shadow-lg"/>
        </a>
      </div>
      <!-- Right: Theme Buttons -->
      <div class="flex items-center justify-end pr-4 bg-accent text-accent-contrast">
        <div class="h-full flex">
          <button
            *ngFor="let theme of availableThemes"
            (click)="applyTheme(theme.name)"
            class="h-full px-4 hover:underline hover:bg-black hover:bg-opacity-30 transition"
          >
            {{ theme.name }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="flex flex-col flex-1 overflow-hidden">
    <div class="h-full flex flex-1 flex-col sm:flex-row">
      <!-- Auth Section -->
      <div class="flex-1 flex justify-center items-center">
        <ng-container *ngTemplateOutlet="authSection"></ng-container>
      </div>

      <!-- Theme Testing Section -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <h1 class="p-4 pt-8 text-2xl font-semibold text-center">Theme Samples</h1>
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
      <a href="https://tiagobarracha.netlify.app" target="_blank" class="hover:text-accent underline">
        Tiago Barracha
      </a>
    </p>
  </footer>
</div>

<!-- Auth Section -->
<ng-template #authSection>
  <div class="max-h-[80%] w-full max-w-sm mx-auto p-4 rounded-lg bg-highlight text-highlight-contrast border border-accent shadow-lg  overflow-y-auto">
    <!-- Login State -->
    <div *ngIf="authState === 'login'">
      <h2 class="text-xl font-semibold mb-4">Login</h2>
      <form [formGroup]="loginForm" (ngSubmit)="onLoginSubmit()">
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            id="email"
            formControlName="email"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            placeholder="Email"
          />
          <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="text-red-500 text-sm">
            Valid email is required.
          </div>
        </div>
        <div class="mb-4">
          <label for="password" class="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            id="password"
            formControlName="password"
            class="w-full max-w-md p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            placeholder="Password"
          />
          <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="text-red-500 text-sm">
            Password is required.
          </div>
        </div>
        <div class="text-red-500 text-sm mb-2" *ngIf="loginError">{{ loginError }}</div>
        <button type="submit" [disabled]="loginForm.invalid" class="px-4 py-2 rounded bg-accent text-highlight hover:underline">
          Login
        </button>
        <p class="mt-4 text-center">
          Don't have an account?
          <a href="#" class="text-accent hover:underline" (click)="toggleAuthState('register')">Register</a>
        </p>
      </form>
    </div>

    <!-- Register State -->
    <div *ngIf="authState === 'register'">
      <h2 class="text-xl font-semibold mb-4">Register</h2>
      <form [formGroup]="registerForm" (ngSubmit)="onRegisterSubmit()">
        <!-- Email -->
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            id="email"
            formControlName="email"
            class="w-full max-w-md p-3 rounded-md border border-primary text-text placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Email"
          />
          <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="text-red-500 text-sm">
            Valid email is required.
          </div>
        </div>

        <!-- Password -->
        <div class="mb-4">
          <label for="password" class="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            id="password"
            formControlName="password"
            class="w-full max-w-md p-3 rounded-md border border-primary text-text placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Password"
          />
          <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="text-red-500 text-sm">
            Password is required.
          </div>
        </div>

        <!-- Confirm Password -->
        <div class="mb-4">
          <label for="confirm-password" class="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            formControlName="confirmPassword"
            class="w-full max-w-md p-3 rounded-md border border-primary text-text placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-200"
            placeholder="Confirm Password"
          />
          <div *ngIf="registerForm.hasError('mismatch') && registerForm.get('confirmPassword')?.touched" class="text-red-500 text-sm">
            Passwords must match.
          </div>
        </div>

        <!-- Register Button -->
        <button type="submit" [disabled]="registerForm.invalid" class="px-4 py-2 rounded bg-accent text-highlight hover:underline">
          Register
        </button>

        <!-- Login Redirection -->
        <p class="mt-4 text-center">
          Already have an account?
          <a href="#" class="text-accent hover:underline" (click)="toggleAuthState('login')">Login</a>
        </p>
      </form>
    </div>

    <!-- Logged-In State -->
    <div *ngIf="authState === 'loggedIn'" class="text-center">
      <h2 class="text-xl font-semibold mb-4">Welcome</h2>
      <p class="mb-4">Logged in as {{ userEmail }}</p>
      <button class="px-4 py-2 rounded bg-accent text-highlight hover:underline" (click)="toggleAuthState('login')">
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
  // Auth states could also be an enum for clarity
  authState: 'login' | 'register' | 'loggedIn' = 'login';

  userEmail = '';
  loginError = '';

  loginForm: FormGroup;
  registerForm: FormGroup;

  availableThemes: Theme[] = [];
  currentTheme!: Theme;

  private readonly DEFAULT_NAME = 'Test';
  private readonly DEFAULT_LASTNAME = 'User';

  constructor(
    private fb: FormBuilder,
    private themeService: ThemeService,
    private authService: AuthService
  ) {
    this.loginForm = this.createLoginForm();
    this.registerForm = this.createRegisterForm();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.availableThemes = this.themeService.getAllThemes();
      this.applyTheme(this.availableThemes[0].name);
    }, 100);
  }

  // ----------------------------------------------
  // Form Initialization
  // ----------------------------------------------

  private createLoginForm(): FormGroup {
    const controls = {
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    };
  
    return this.fb.group(controls);
  }
  
  private createRegisterForm(): FormGroup {
    const controls = {
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      lastName: [''],
    };
  
    const options: AbstractControlOptions = {
      validators: this.passwordMatchValidator as ValidatorFn,
    };
  
    return this.fb.group(controls, options);
  }

  // ----------------------------------------------
  // Validation Helpers
  // ----------------------------------------------

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  passwordMismatch(): boolean {
    return this.registerForm.hasError('mismatch');
  }

  shouldShowLoginError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  shouldShowRegisterError(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  // ----------------------------------------------
  // Theme Management
  // ----------------------------------------------

  applyTheme(themeName: string): void {
    this.themeService.applyThemeSmoothByName(themeName);
  }

  // ----------------------------------------------
  // Auth State Handling
  // ----------------------------------------------

  toggleAuthState(state: 'login' | 'register' | 'loggedIn'): void {
    if (state === 'loggedIn') {
      this.userEmail = 'user@example.com';
    } else {
      this.userEmail = '';
    }
    this.authState = state;
  }

  // ----------------------------------------------
  // Login
  // ----------------------------------------------

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;
    this.logAndResetError('Attempting login...');

    this.authService.login({ email, password } as AuthLoginModel).subscribe({
      next: (response: AuthResponseModel) => {
        if (response.result) {
          this.userEmail = email;
          this.authState = 'loggedIn';
        } else {
          this.loginError = response.message;
        }
      },
      error: (err) => {
        this.handleError('Login', err);
      },
    });
  }

  // ----------------------------------------------
  // Register
  // ----------------------------------------------

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }
  
    const { email, password, confirmPassword, name, lastName } = this.registerForm.value;
    const registerData: AuthRegisterModel = {
      email,
      password,
      confirmPassword,
      name: name?.trim() || email, // Default name to email if not provided
      lastName: lastName || '', // Optional
    };
  
    this.logAndResetError('Attempting registration...');
  
    this.authService.register(registerData).subscribe({
      next: (response: AuthResponseModel) => {
        if (response.result) {
          this.userEmail = email;
          this.authState = 'loggedIn';
        } else {
          this.loginError = response.message;
        }
      },
      error: (err) => {
        this.handleError('Registration', err);
      },
    });
  }

  // ----------------------------------------------
  // Error Handling and Logging
  // ----------------------------------------------

  private logAndResetError(message: string): void {
    console.log(message);
    this.loginError = '';
  }

  private handleError(context: string, err: any): void {
    console.error(`${context} error:`, err);
    this.loginError = `An error occurred during ${context.toLowerCase()}. Please try again.`;
  }
}