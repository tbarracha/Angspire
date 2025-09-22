// playable-interfaces.ts

export enum PlayableState {
  Idle = 'Idle',
  Playing = 'Playing',
  Paused = 'Paused',
  Stopped = 'Stopped',
  Cancelled = 'Cancelled',
}

export interface IPlayable {
  play(): void;
}

export interface IStoppable {
  stop(): void;
}

export interface IPauseable {
  pause(): void;
}

export interface IResumable {
  resume(): void;
}

export interface ICancellable {
  cancel(): void;
}

export interface IProgressable {
  readonly progress: number;
}