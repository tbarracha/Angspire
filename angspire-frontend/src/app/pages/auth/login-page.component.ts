import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AuthService } from '../../features/authentication/auth.service';
import { Router, RouterModule } from '@angular/router';
import { SocialLoginButtonsComponent } from "./social-login-buttons.component";
import { LoginRequestDto } from '../../features/authentication/dtos/requests/login-request-dto';
import { InputComponent } from '../../shared/components/input.component';
import { ButtonComponent } from "../../shared/components/button.component";

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SocialLoginButtonsComponent, InputComponent, ButtonComponent],
  template: `
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
      <h2 class="text-2xl font-bold text-center">Login</h2>

      <!-- Inputs -->
      <div class="flex flex-col gap-4">
        <input-component
          id="email"
          label="Email"
          type="email"
          [value]="emailControl.value"
          (valueChange)="onInputChange(emailControl, $event)"
          placeholder="you@example.com"
          [errorText]="getEmailErrorText()"
          autocomplete="email"
        ></input-component>

        <input-component
          id="password"
          label="Password"
          type="password"
          [value]="passwordControl.value"
          (valueChange)="onInputChange(passwordControl, $event)"
          placeholder="Password"
          [errorText]="getPasswordErrorText()"
          autocomplete="current-password"
        ></input-component>
      </div>

      <!-- Error Message -->
      <div *ngIf="loginError" class="text-error text-sm text-center">{{ loginError }}</div>

      <!-- Submit Button -->
      <div>
        <app-button
          type="accent"
          styleIdle="filled"
          styleHover="outlined"
          htmlType="submit"
          [disabled]="loginForm.invalid"
          class="w-full"
        >
          Login
        </app-button>

      </div>

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

  get emailControl(): FormControl {
    return this.loginForm.get('email') as FormControl;
  }
  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  onInputChange(control: FormControl, value: string) {
    control.setValue(value);
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  getEmailErrorText(): string {
    const control = this.emailControl;
    if (!control.touched && !control.dirty) return '';
    if (control.hasError('required')) return 'Email is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    return '';
  }

  getPasswordErrorText(): string {
    const control = this.passwordControl;
    if (!control.touched && !control.dirty) return '';
    if (control.hasError('required')) return 'Password is required.';
    return '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.emailControl.markAsTouched();
      this.passwordControl.markAsTouched();
      this.emailControl.updateValueAndValidity();
      this.passwordControl.updateValueAndValidity();
      return;
    }

    const dto: LoginRequestDto = this.loginForm.value;
    this.loginError = '';

    this.authService.login(dto).subscribe({
      next: () => {
        this.loggedIn.emit();
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.loginError = err?.error?.Error ?? 'Login failed. Please try again.';
      }
    });
  }
}
