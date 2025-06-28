import { Subscription } from 'rxjs';
import { TickService, TickInfo } from './tick.service';
import {
  IPlayable,
  IStoppable,
  IPauseable,
  IResumable,
  ICancellable,
  IProgressable,
  PlayableState,
} from '../../models/playable-interfaces';

export class TickTimer
  implements IPlayable, IStoppable, IPauseable, IResumable, ICancellable, IProgressable {
  private elapsedTime = 0;
  private elapsedTicks = 0;
  private sub: Subscription | null = null;
  private _state: PlayableState = PlayableState.Idle;

  // All event handlers are assignable properties
  onStart?: () => void;
  onUpdate?: (progress: number, elapsedTime: number) => void;
  onComplete?: () => void;
  onCanceled?: () => void;
  onStateChanged?: (newState: PlayableState, prevState: PlayableState) => void;

  constructor(
    private tickService: TickService,
    private duration: number, // in seconds
    onUpdate?: (progress: number, elapsedTime: number) => void,
    onComplete?: () => void,
    onCanceled?: () => void
  ) {
    if (onUpdate) this.onUpdate = onUpdate;
    if (onComplete) this.onComplete = onComplete;
    if (onCanceled) this.onCanceled = onCanceled;
  }

  get progress(): number {
    return Math.max(0, Math.min(this.elapsedTime / this.duration, 1));
  }

  getState(): PlayableState {
    return this._state;
  }

  isRunning(): boolean {
    return this._state === PlayableState.Playing;
  }

  private setState(newState: PlayableState) {
    if (this._state !== newState) {
      const prev = this._state;
      this._state = newState;
      if (this.onStateChanged) this.onStateChanged(newState, prev);
    }
  }

  play(): void {
    if (this._state === PlayableState.Playing || this._state === PlayableState.Paused) return;
    this.elapsedTime = 0;
    this.elapsedTicks = 0;
    this.setState(PlayableState.Playing);
    if (this.onStart) this.onStart();

    this.sub = this.tickService.ticks$.subscribe((tick: TickInfo) => {
      if (this._state === PlayableState.Paused) return;
      if (this._state !== PlayableState.Playing) return;

      this.elapsedTime += tick.deltaTime;
      this.elapsedTicks++;
      const progress = this.progress;
      if (this.onUpdate) this.onUpdate(progress, this.elapsedTime);

      if (this.elapsedTime >= this.duration) {
        this.stop();
        if (this.onComplete) this.onComplete();
      }
    });
  }

  stop(): void {
    if (this.sub) this.sub.unsubscribe();
    this.sub = null;
    this.setState(PlayableState.Stopped);
  }

  pause(): void {
    if (this._state !== PlayableState.Playing) return;
    this.setState(PlayableState.Paused);
  }

  resume(): void {
    if (this._state !== PlayableState.Paused) return;
    this.setState(PlayableState.Playing);
  }

  cancel(): void {
    this.stop();
    this.setState(PlayableState.Cancelled);
    if (this.onCanceled) this.onCanceled();
  }
}
