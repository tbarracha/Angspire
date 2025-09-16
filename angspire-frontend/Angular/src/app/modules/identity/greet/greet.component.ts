import { Component, Input, Output, EventEmitter, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../authentication/services/auth.service';

@Component({
  selector: 'app-greet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="p-4">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-full border flex items-center justify-center">
          <span class="text-sm font-semibold">{{ initials() }}</span>
        </div>

        <div class="flex-1">
          <h2 class="text-xl font-semibold">
            {{ headline() }}
          </h2>
          @if (subline()) {
            <p class="text-sm text-gray-600">{{ subline() }}</p>
          }
        </div>

        @if (isLoggedIn()) {
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm"
            (click)="onLogout()"
          >
            {{ logoutLabel }}
          </button>
        }
      </div>
    </section>
  `
})
export class GreetComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Optional overrides */
  @Input() title?: string;
  @Input() subtitle?: string;

  /** Logout UX */
  @Input() logoutLabel = 'Logout';
  /** If set (default '/login'), navigate after logout. Set to '' to disable redirect. */
  @Input() redirectAfterLogout: string = '/login';

  /** Event fired after logout completes (before optional redirect). */
  @Output() loggedOut = new EventEmitter<void>();

  private identitySig = signal(this.auth.getCachedIdentity() ?? null);

  constructor() {
    // keep in sync; silent hydrate best-effort
    this.auth.getJwtIdentity().subscribe({ next: id => this.identitySig.set(id), error: () => {} });
    AuthService.onLogin.subscribe(id => this.identitySig.set(id));
    AuthService.onUserLogin.subscribe(id => this.identitySig.set(id));
    AuthService.onServiceLogin.subscribe(id => this.identitySig.set(id));
    AuthService.onLogout.subscribe(() => this.identitySig.set(null));
  }

  /** Whether we currently have a valid identity */
  isLoggedIn = computed(() => !!this.identitySig());

  private displayName = computed(() => {
    const i = this.identitySig() as any;
    const d = i?.displayName || [i?.firstName, i?.lastName].filter(Boolean).join(' ');
    return d || i?.userName || i?.email || i?.serviceName || 'friend';
  });

  initials = computed(() => this.displayName().slice(0, 2).toUpperCase());

  headline = computed(() =>
    this.title ? this.title : `Hello, ${this.displayName()} 👋`
  );

  subline = computed(() =>
    this.subtitle ?? (this.identitySig() ? 'Welcome back.' : 'You are not signed in.')
  );

  onLogout(): void {
    this.auth.logout();
    this.loggedOut.emit();
    if (this.redirectAfterLogout) {
      // Best-effort navigation; ignore errors (e.g., if already on /login)
      this.router.navigateByUrl(this.redirectAfterLogout).catch(() => {});
    }
  }
}
