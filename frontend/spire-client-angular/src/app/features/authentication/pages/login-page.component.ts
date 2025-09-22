import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SocialLoginButtonsComponent } from '../components/social-login-buttons.component';
import { ButtonComponent } from '../../../spire-lib/ui-kit/input-components/button.component';
import { InputComponent } from '../../../spire-lib/ui-kit/input-components/input.component';
import { LoginRequestDto } from '../../../spire-lib/modules/authentication/models/auth-models';
import { AuthService } from '../../../spire-lib/modules/authentication/services/auth.service';

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
          htmlType="submit"
          [disabled]="loginForm.invalid"
          [mainColor]="'accent'"
          [contentColor]="'accent-content'"
          variant="solid"
          hoverStyle="outline"
          class="w-full"
        >
          Login
        </app-button>
      </div>

      <!-- Switch -->
      <p class="text-sm text-center text-base-300">
        Don’t have an account?
        <a [routerLink]="['/register']" class="text-accent hover:underline">Register</a>
      </p>

      <!-- Divider -->
      <div class="flex items-center text-base-300">
        <div class="flex-grow border-t border-base-300"></div>
        <span class="px-3 text-sm">or</span>
        <div class="flex-grow border-t border-base-300"></div>
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

    const formValue = this.loginForm.value;
    const dto: LoginRequestDto = {
      identifier: formValue.email,
      password: formValue.password
    }

    console.log("Login FORM:", formValue);
    console.log("Login DTO:", dto);
    this.loginError = '';

    this.authService.login(dto).subscribe({
      next: () => {
        this.loggedIn.emit();
      },
      error: (err) => {
        console.error('Login error:', err);
        this.loginError = err?.error?.Error ?? 'Login failed. Please try again.';
      }
    });
  }
}