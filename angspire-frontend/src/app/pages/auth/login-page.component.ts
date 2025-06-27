import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/authentication/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { SocialLoginButtonsComponent } from "./social-login-buttons.component";
import { LoginRequestDto } from '../../core/dtos/App/Authentication/Requests/login-request-dto';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SocialLoginButtonsComponent],
  template: `
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
      <h2 class="text-2xl font-bold text-center">Login</h2>

      <!-- Email -->
      <div>
        <label for="email" class="block text-sm font-medium mb-1">Email</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          placeholder="you@example.com"
        />
        <div *ngIf="showError('email')" class="text-red-500 text-sm mt-1">Valid email is required.</div>
      </div>

      <!-- Password -->
      <div>
        <label for="password" class="block text-sm font-medium mb-1">Password</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          placeholder="Password"
        />
        <div *ngIf="showError('password')" class="text-red-500 text-sm mt-1">Password is required.</div>
      </div>

      <!-- Error -->
      <div *ngIf="loginError" class="text-red-500 text-sm text-center">{{ loginError }}</div>

      <!-- Submit -->
      <button
        type="submit"
        [disabled]="loginForm.invalid"
        class="w-full px-4 py-2 rounded bg-accent text-highlight font-semibold hover:underline transition"
      >
        Login
      </button>

      <!-- Switch -->
      <p class="text-sm text-center">
        Don’t have an account?
        <a [routerLink]="['/auth/register']" class="text-accent hover:underline">Register</a>
      </p>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-300"></div></div>
        <div class="relative flex justify-center text-sm"><span class="bg-highlight px-2 text-muted">or</span></div>
      </div>

      <!-- Social Buttons -->
      <app-social-login-buttons />
    </form>
  `
})
export class LoginPageComponent {
  @Output() loggedIn = new EventEmitter<void>();
  loginForm: FormGroup;
  loginError = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  showError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    const dto: LoginRequestDto = this.loginForm.value;
    this.loginError = '';

    this.authService.login(dto).subscribe({
      next: () => {
        this.loggedIn.emit();
        this.router.navigate(['/dashboard']); // or your post-login route
      },
      error: (err) => {
        console.error('Login error:', err);
        this.loginError = err?.error?.Error ?? 'Login failed. Please try again.';
      }
    });
  }
}