import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AngspireHome } from "./angspire.landing";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AngspireHome],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Angspire';
}
