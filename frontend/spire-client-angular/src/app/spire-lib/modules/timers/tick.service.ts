// tick.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject, interval } from 'rxjs';
import { TickTimer } from './tick-timer';

export interface TickInfo {
    tick: number;
    time: number;
    deltaTime: number;
}

@Injectable({ providedIn: 'root' })
export class TickService {
    private tickSubject = new Subject<TickInfo>();
    private lastTime: number | null = null;
    private tickCount = 0;

    public readonly ticks$: Observable<TickInfo> = this.tickSubject.asObservable();

    constructor() {
        interval(1000 / 60).subscribe(() => this.emitTick());
    }

    private emitTick() {
        const now = performance.now();
        let deltaTime = 1 / 60;
        if (this.lastTime !== null) {
            deltaTime = (now - this.lastTime) / 1000;
        }
        this.tickCount++;
        this.tickSubject.next({ tick: this.tickCount, time: now, deltaTime });
        this.lastTime = now;
    }

    getTickCount(): number {
        return this.tickCount;
    }

    getLastTickTime(): number | null {
        return this.lastTime;
    }

    createTimer(
        duration: number, // in seconds
        onUpdate?: (progress: number, elapsedTime: number) => void,
        onComplete?: () => void,
        onCanceled?: () => void
    ): TickTimer {
        return new TickTimer(this, duration, onUpdate, onComplete, onCanceled);
    }
}
