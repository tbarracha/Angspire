import { Component } from '@angular/core';

@Component({
  selector: 'app-social-login-buttons',
  standalone: true,
  imports: [],
  template: `
    <div class="flex flex-row justify-center gap-4">
      <button
        type="button"
        class="h-12 w-12 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-100 transition flex items-center justify-center"
        aria-label="Login with Google"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="h-5 w-5" />
      </button>

      <button
        type="button"
        class="h-12 w-12 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-100 transition flex items-center justify-center"
        aria-label="Login with Facebook"
      >
        <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" class="h-5 w-5" />
      </button>

      <button
        type="button"
        class="h-12 w-12 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-100 transition flex items-center justify-center"
        aria-label="Login with Apple"
      >
        <img src="https://www.svgrepo.com/show/503173/apple-logo.svg" alt="Apple" class="h-5 w-5" />
      </button>
    </div>
  `
})
export class SocialLoginButtonsComponent {}
