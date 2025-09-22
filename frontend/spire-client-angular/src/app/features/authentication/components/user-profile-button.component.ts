import {
  Component,
  Input,
  inject,
  EnvironmentInjector,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconAccountComponent, IconSettingsComponent, IconLogoutComponent } from '../../icons/components';
import { SmartOverlayService, SmartOverlayHandle } from '../../../spire-lib/modules/overlay/smart-overlay.service';
import { OptionItemListComponent } from '../../../spire-lib/ui-kit/option-list-components/option-item-list.component';
import { OptionListConfig, OptionListGroup } from '../../../spire-lib/ui-kit/option-list-components/option-item.model';
import { AuthService } from '../../../spire-lib/modules/authentication/services/auth.service';

@Component({
  selector: 'app-user-profile-button',
  standalone: true,
  imports: [CommonModule, IconAccountComponent],
  template: `
    <button
      type="button"
      class="relative flex items-center justify-center h-10 w-10 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
      (click)="openOptions($event)"
      [disabled]="isLoggingOut"
      aria-label="User menu"
    >
      @if (photoUrl) {
        <img [src]="photoUrl" [alt]="userName" class="h-full w-full object-cover" />
      } @else {
        <icon-user />
      }
    </button>
  `
})
export class UserProfileButtonComponent implements OnDestroy {
  @Input() userName = 'User Name';
  @Input() photoUrl?: string;

  private readonly overlaySvc = inject(SmartOverlayService);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly authService = inject(AuthService);

  private _handle: SmartOverlayHandle<OptionItemListComponent> | null = null;
  isLoggingOut = false;

  readonly optionStyle: OptionListConfig = {
    classes: {
      textClasses: 'text-tertiary',
      bgClasses: 'hover:bg-secondary',
      bgExpandedClasses: 'bg-blue-50',
    }
  };

  openOptions(evt: MouseEvent) {
    if (this.isLoggingOut) return;
    evt.stopPropagation();
    this.close();

    const group: OptionListGroup = {
      classes: {
        textClasses: 'text-tertiary',
        bgClasses: 'rounded-lg m-1 group-hover:bg-secondary/25'
      },
      items: [
        { iconComponent: IconAccountComponent, label: 'Profile', onClick: () => this._route('profile') },
        { iconComponent: IconSettingsComponent, label: 'Settings', onClick: () => this._route('settings') },
        {
          iconComponent: IconLogoutComponent,
          label: 'Logout',
          classes: { textClasses: 'text-error', bgClasses: 'group-hover:bg-error/15' },
          onClick: () => this._route('logout')
        }
      ]
    };

    this._handle = this.overlaySvc.open<OptionItemListComponent>(
      evt.currentTarget as HTMLElement,
      OptionItemListComponent,
      this.envInjector,
      { panelClass: ['bg-primary', 'shadow-xl', 'rounded-xl'] }
    );

    const cmp = this._handle.componentRef.instance;
    cmp.groups = [group];
    cmp.config = this.optionStyle;
  }

  close() {
    this._handle?.close();
    this._handle = null;
  }

  ngOnDestroy() {
    this.close();
  }

  private _route(action: 'profile' | 'settings' | 'logout') {
    switch (action) {
      case 'profile':
        // TODO: navigate to profile page
        break;

      case 'settings':
        // TODO: open settings
        break;

      case 'logout':
        this.logoutAccurately();
        break;
    }
    // For profile/settings we still close the menu immediately
    if (action !== 'logout') this.close();
  }

  private logoutAccurately() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    // Close the overlay first to avoid UI races, then trigger logout.
    try {
      this.close();
      this.authService.logout(); // AuthStateService hears onUserLogout -> clears user + routes to /login
    } finally {
      // keep disabled state minimal; AuthStateService will navigate promptly
      this.isLoggingOut = false;
    }
  }
}
