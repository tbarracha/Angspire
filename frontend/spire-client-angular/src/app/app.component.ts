import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppStateService } from './app-state/app-state.service';
import { AppFooterComponent } from "./shared/components/app-footer.component";
import { ThemeService } from './spire-lib/modules/themes/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppFooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly appState = inject(AppStateService);
  private readonly themeService = inject(ThemeService);
  
  title = 'Angspire';
}
