import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControlOptions, ValidatorFn
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../features/authentication/auth.service';
import { SocialLoginButtonsComponent } from './social-login-buttons.component';
import { RegisterRequestDto } from '../../features/authentication/dtos/requests/register-request-dto';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SocialLoginButtonsComponent],
  template: `
    <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
      <h2 class="text-2xl font-bold text-center">Register</h2>

      <!-- Step 1 -->
      <ng-container *ngIf="step === 1">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input id="email" type="email" formControlName="email" placeholder="you@example.com"
            class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" />
          <div *ngIf="showError('email')" class="text-red-500 text-sm mt-1">Valid email is required.</div>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium mb-1">Password</label>
          <input id="password" type="password" formControlName="password" placeholder="Password"
            class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" />
          <div *ngIf="showError('password')" class="text-red-500 text-sm mt-1">Password is required.</div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium mb-1">Confirm Password</label>
          <input id="confirmPassword" type="password" formControlName="confirmPassword" placeholder="Confirm password"
            class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" />
          <div *ngIf="passwordMismatch()" class="text-red-500 text-sm mt-1">Passwords must match.</div>
        </div>

        <button type="button" (click)="goToStep(2)" [disabled]="stepOneInvalid()" class="w-full px-4 py-2 rounded bg-accent text-highlight font-semibold hover:underline transition">
          Continue
        </button>
      </ng-container>

      <!-- Step 2 -->
      <ng-container *ngIf="step === 2">
        <!-- First Name -->
        <div>
          <label for="name" class="block text-sm font-medium mb-1">First Name</label>
          <input id="name" type="text" formControlName="name" placeholder="First Name"
            class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" />
        </div>

        <!-- Last Name -->
        <div>
          <label for="lastName" class="block text-sm font-medium mb-1">Last Name</label>
          <input id="lastName" type="text" formControlName="lastName" placeholder="Last Name"
            class="w-full p-3 rounded-md border border-primary placeholder-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" />
        </div>

        <!-- Error -->
        <div *ngIf="registerError" class="text-red-500 text-sm text-center">{{ registerError }}</div>

        <!-- Submit -->
        <button type="submit" [disabled]="registerForm.invalid" class="w-full px-4 py-2 rounded bg-accent text-highlight font-semibold hover:underline transition">
          Register
        </button>
        <button type="button" (click)="goToStep(1)" class="w-full px-4 py-2 rounded bg-gray-300 text-black font-semibold hover:bg-gray-400 transition">
          Back
        </button>
      </ng-container>

      <!-- Switch -->
      <p class="text-sm text-center">
        Already have an account?
        <a [routerLink]="['/auth/login']" class="text-accent hover:underline">Login</a>
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
export class RegisterPageComponent {
  step = 1;
  registerError = '';
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      name: [''],
      lastName: ['']
    }, {
      validators: this.passwordMatchValidator as ValidatorFn
    } as AbstractControlOptions);
  }

  goToStep(step: 1 | 2) {
    this.step = step;
  }

  stepOneInvalid(): boolean {
    return (
      this.registerForm.get('email')?.invalid ||
      this.registerForm.get('password')?.invalid ||
      this.registerForm.get('confirmPassword')?.invalid ||
      this.passwordMismatch()
    );
  }

  showError(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  passwordMismatch(): boolean {
    return this.registerForm.hasError('mismatch') && !!this.registerForm.get('confirmPassword')?.touched;
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    const { email, password, name, lastName } = this.registerForm.value;
    const dto: RegisterRequestDto = {
      email,
      password,
      firstName: name?.trim() || email,
      lastName: lastName?.trim() || ''
    };

    this.registerError = '';
    this.authService.register(dto).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => {
        console.error('Register error:', err);
        this.registerError = err?.error?.Error ?? 'Registration failed. Please try again.';
      }
    });
  }
}