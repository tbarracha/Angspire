import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControlOptions, ValidatorFn, FormControl
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SocialLoginButtonsComponent } from '../components/social-login-buttons.component';
import { ButtonComponent } from '../../../spire-lib/ui-kit/input-components/button.component';
import { InputComponent } from '../../../spire-lib/ui-kit/input-components/input.component';
import { RegisterUserRequestDto } from '../../../spire-lib/modules/authentication/models/auth-models';
import { AuthService } from '../../../spire-lib/modules/authentication/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SocialLoginButtonsComponent, InputComponent, ButtonComponent],
  template: `
    <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
      <h2 class="text-2xl font-bold text-center">Register</h2>

      <!-- Step 1 -->
      <ng-container *ngIf="step === 1">
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
            autocomplete="new-password"
          ></input-component>

          <input-component
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            [value]="confirmPasswordControl.value"
            (valueChange)="onInputChange(confirmPasswordControl, $event)"
            placeholder="Confirm password"
            [errorText]="getConfirmPasswordErrorText()"
            autocomplete="new-password"
          ></input-component>
        </div>
        <div class="mt-4">
          <app-button
            type="accent"
            styleIdle="filled"
            styleHover="outlined"
            htmlType="button"
            [disabled]="stepOneInvalid()"
            class="w-full text-light"
            (click)="goToStep(2)">
            Continue
          </app-button>
        </div>
      </ng-container>

      <!-- Step 2 -->
      <ng-container *ngIf="step === 2">
        <div class="flex flex-col gap-4">
          <input-component
            id="name"
            label="First Name"
            type="text"
            [value]="firstNameControl.value"
            (valueChange)="onInputChange(firstNameControl, $event)"
            placeholder="First Name"
            autocomplete="given-name"
          ></input-component>

          <input-component
            id="lastName"
            label="Last Name"
            type="text"
            [value]="lastNameControl.value"
            (valueChange)="onInputChange(lastNameControl, $event)"
            placeholder="Last Name"
            autocomplete="family-name"
          ></input-component>

          <div *ngIf="registerError" class="text-error text-sm text-center">{{ registerError }}</div>
        </div>

        <div class="flex flex-col gap-2">
          <app-button
            type="accent"
            styleIdle="filled"
            styleHover="outlined"
            htmlType="submit"
            [disabled]="registerForm.invalid"
            class="w-full text-light">
            Register
          </app-button>

          <app-button
            type="secondary"
            styleIdle="filled"
            styleHover="outlined"
            htmlType="button"
            class="w-full text-light"
            (click)="goToStep(1)">
            Back
          </app-button>
        </div>
      </ng-container>

      <!-- Switch -->
      <p class="text-sm text-center text-secondary">
        Already have an account?
        <a [routerLink]="['/login']" class="text-accent hover:underline">Login</a>
      </p>

      <!-- Divider -->
      <div class="relative text-secondary">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-secondary"></div></div>
        <div class="relative flex justify-center text-sm"><span class="bg-light px-2">or</span></div>
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

  get emailControl(): FormControl {
    return this.registerForm.get('email') as FormControl;
  }
  get passwordControl(): FormControl {
    return this.registerForm.get('password') as FormControl;
  }
  get confirmPasswordControl(): FormControl {
    return this.registerForm.get('confirmPassword') as FormControl;
  }
  get firstNameControl(): FormControl {
    return this.registerForm.get('name') as FormControl;
  }
  get lastNameControl(): FormControl {
    return this.registerForm.get('lastName') as FormControl;
  }

  onInputChange(control: FormControl, value: string) {
    control.setValue(value);
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  goToStep(step: 1 | 2) {
    this.step = step;
  }

  stepOneInvalid(): boolean {
    return (
      this.emailControl.invalid ||
      this.passwordControl.invalid ||
      this.confirmPasswordControl.invalid ||
      this.passwordMismatch()
    );
  }

  getEmailErrorText(): string {
    const c = this.emailControl;
    if (!c.touched && !c.dirty) return '';
    if (c.hasError('required')) return 'Email is required.';
    if (c.hasError('email')) return 'Enter a valid email address.';
    return '';
  }
  getPasswordErrorText(): string {
    const c = this.passwordControl;
    if (!c.touched && !c.dirty) return '';
    if (c.hasError('required')) return 'Password is required.';
    return '';
  }
  getConfirmPasswordErrorText(): string {
    const c = this.confirmPasswordControl;
    if (!c.touched && !c.dirty) return '';
    if (c.hasError('required')) return 'Confirm your password.';
    if (this.passwordMismatch()) return 'Passwords must match.';
    return '';
  }

  passwordMismatch(): boolean {
    return this.registerForm.hasError('mismatch') && !!this.confirmPasswordControl.touched;
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.emailControl.markAsTouched();
      this.passwordControl.markAsTouched();
      this.confirmPasswordControl.markAsTouched();
      this.emailControl.updateValueAndValidity();
      this.passwordControl.updateValueAndValidity();
      this.confirmPasswordControl.updateValueAndValidity();
      return;
    }

    const { email, password, name, lastName } = this.registerForm.value;
    const dto: RegisterUserRequestDto = {
      email,
      password,
      firstName: name?.trim() || email,
      lastName: lastName?.trim() || ''
    };

    this.registerError = '';
    this.authService.registerUser(dto).subscribe({
      error: (err) => {
        console.error('Register error:', err);
        this.registerError = err?.error?.Error ?? 'Registration failed. Please try again.';
      }
    });
  }
}
