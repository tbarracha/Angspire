import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="h-6 w-full px-2 flex items-center justify-center bg-neutral text-base-100">
      <p class="text-sm flex items-center space-x-1">
        <span>Made with</span>
        <svg
          class="h-4 w-4 text-red-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
          ></path>
        </svg>
        <span>by</span>
        <a href="https://tiagobarracha.netlify.app" target="_blank" class="hover:text-accent underline">
          Tiago Barracha
        </a>
      </p>
    </footer>
  `
})
export class AppFooterComponent {}
