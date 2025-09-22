import { Component, computed, signal } from '@angular/core';
import { AppStateService } from '../../app-state/app-state.service';
import { AuthService } from '../../spire-lib/modules/authentication/services/auth.service';
import { ButtonComponent } from '../../spire-lib/ui-kit/input-components/button.component';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent],
  template: `
    <div class="h-full w-full flex flex-col">
      <div class="flex-grow flex items-center justify-center text-xl">
        @if(userName()) {
          <p>Hello, {{ userName() }}!</p>
        } @else {
          <p>Hello!</p>
        }
      </div>
      <div class="flex justify-center space-x-4 p-4 border-t">
        <app-button
          (click)="logout()"
          variant="outline"
          hoverStyle="solid"
          [mainColor]="'error'"
          [contentColor]="'error-content'"
          class="px-4 py-2"
        >
          Logout
        </app-button>
        <app-button
          (click)="getJwt()"
          variant="solid"
          [mainColor]="'accent'"
          [contentColor]="'accent-content'"
          class="px-4 py-2"
        >
          Get JWT
        </app-button>
      </div>
      @if(jwtJson()) {
        <pre class="p-4 overflow-auto">{{ jwtJson() }}</pre>
      }
    </div>
  `
})
export class HomePageComponent {
  jwtJson = signal<string | null>(null);

  userName = computed(() => {
    const user = this.appState.currentUser();
    return user?.displayName || user?.userName || null;
  });

  constructor(private appState: AppStateService, private authService: AuthService) {}

  logout() {
    this.appState.logout();
  }

  getJwt() {
    this.jwtJson.set('Loading...');
    const token = this.authService.getAccessToken();
    if (token) {
      this.jwtJson.set(token);
    } else {
      this.jwtJson.set('No JWT token available');
    }
  }
}
