import { EventEmitter, Injectable } from '@angular/core';
import { Theme } from './theme.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  public readonly onThemeChange : EventEmitter<Theme> = new EventEmitter<Theme>();

  public readonly onUserLogin : EventEmitter<any> = new EventEmitter<any>();
  public readonly onUserLogout : EventEmitter<any> = new EventEmitter<any>();

  constructor() { }
}
