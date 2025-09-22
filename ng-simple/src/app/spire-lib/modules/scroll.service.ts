import { Injectable, OnDestroy, signal } from '@angular/core';

export type ScrollState = 'idle' | 'auto';

export interface ScrollConfig {
  margin: number;          // px to consider "near bottom"
  minSpeed: number;        // px/sec initial speed
  maxSpeed: number;        // px/sec cap
  rampSeconds: number;     // seconds to reach max speed
  minStep: number;         // px per frame minimum
  maxArmTries: number;     // double-rAF tries to wait for layout after swaps
}

const DEFAULT_CFG: ScrollConfig = {
  margin: 150,
  minSpeed: 800,
  maxSpeed: 6000,
  rampSeconds: 0.6,
  minStep: 1,
  maxArmTries: 4
};

@Injectable({ providedIn: 'any' }) // per-host instance when provided by component
export class ScrollService implements OnDestroy {
  // DOM target
  private el: HTMLElement | null = null;

  // runtime
  private state = signal<ScrollState>('idle');
  private _showScrollButton = signal<boolean>(false);
  private _streaming = signal<boolean>(false);

  // animation
  private rafId: number | null = null;
  private lastTs = 0;
  private curSpeed = 0;               // px/sec
  private programmatic = false;       // guard for our own scroll events
  private timedEndTs: number | null = null; // when set, finish exactly at this timestamp

  // config
  private cfg: ScrollConfig = { ...DEFAULT_CFG };

  // expose (signals read in template trigger reactivity)
  showScrollButton(): boolean { return this._showScrollButton(); }
  isAuto(): boolean { return this.state() === 'auto'; }

  attach(el: HTMLElement, cfg?: Partial<ScrollConfig>): void {
    this.el = el;
    if (cfg) this.cfg = { ...this.cfg, ...cfg };
    this.recalculate(); // compute initial button state
  }

  detach(): void {
    this.stopAuto();
    this.el = null;
  }

  setStreaming(v: boolean): void {
    const was = this._streaming();
    this._streaming.set(!!v);

    // If streaming just turned on and we’re near bottom, follow.
    if (!was && v && this.isNearBottom()) this.startAuto();
    // If streaming turned off and we’re virtually at bottom, stop on next tick automatically.
  }

  /** Recalculate derived UI (e.g., scroll button visibility) */
  recalculate(): void {
    this.updateScrollButton();
  }

  /** Hard intent: always scroll to bottom; waits layout if needed. */
  hardScrollToBottom(): void {
    const el = this.el;
    if (!el) return;

    let tries = 0;
    const arm = () => {
      if (!this.el) return;
      if (this.isScrollable() || this.el.scrollHeight > this.el.clientHeight) {
        this.startAuto();
        return;
      }
      if (tries++ >= this.cfg.maxArmTries) {
        this.startAuto(); // arm anyway; tick will follow growth
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(arm));
    };
    arm();
  }

  /** Soft intent: only scroll if already near bottom. */
  softScrollToBottomIfNear(): void {
    if (!this.isScrollable()) { this.updateScrollButton(); return; }
    if (this.isNearBottom()) this.startAuto();
    else this.updateScrollButton();
  }

  /** Forwarded from host’s (scroll) event. */
  onScroll(userInitiated = true): void {
    this.updateScrollButton();

    if (!this.el) return;

    // Ignore our own programmatic scroll movement.
    if (this.programmatic) {
      this.programmatic = false;
      return;
    }

    // User took control → stop auto
    if (userInitiated && this.isAuto()) this.stopAuto();

    // While streaming, if user returns to bottom area, resume auto
    if (userInitiated && this._streaming() && this.isNearBottom()) this.startAuto();
  }

  /** Forwarded from wheel/touch/mousedown (any user interaction). */
  onUserInteract(): void {
    if (this.isAuto()) this.stopAuto();
  }

  // ===== new API =====

  /** Returns the constant velocity (px/sec) needed to reach bottom in `seconds`. */
  calcVelocityToBottom(seconds: number): number {
    if (!this.el) return 0;
    const d = Math.max(0, this.distanceFromBottom());
    const t = Math.max(0.001, seconds);
    return d / t;
  }

  /**
   * Scroll to bottom in ~`seconds` seconds (time-driven).
   * Prioritizes hitting the target time; ignores ramp/min/max speeds unless you clamp below.
   */
  scrollToBottomIn(seconds: number): void {
    if (!this.el) return;
    const t = Math.max(0.05, seconds); // avoid degenerate 0s
    this.timedEndTs = performance.now() + t * 1000;

    // enter auto mode and start the loop
    this.state.set('auto');
    this.lastTs = 0;
    this.curSpeed = 0;
    this.tick();
  }

  // ===== internals =====
  private startAuto(): void {
    if (this.isAuto()) return;
    this.state.set('auto');
    this.lastTs = 0;
    this.curSpeed = this.cfg.minSpeed;
    this.timedEndTs = null; // regular auto cancels timed mode
    this.tick();
  }

  private stopAuto(): void {
    this.state.set('idle');
    this.lastTs = 0;
    this.curSpeed = 0;
    this.timedEndTs = null;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (ts?: number): void => {
    if (!this.isAuto()) return;
    const el = this.el;
    if (!el) { this.stopAuto(); return; }

    const now = typeof ts === 'number' ? ts : performance.now();
    const dt = this.lastTs ? (now - this.lastTs) / 1000 : 0;
    this.lastTs = now;

    const targetTop = el.scrollHeight - el.clientHeight;
    const currentTop = el.scrollTop;
    const distance = Math.max(0, targetTop - currentTop);

    // Reached bottom?
    if (distance <= 1) {
      if (!this._streaming()) {
        this.stopAuto();
        this.updateScrollButton();
        return;
      }
      // Stay armed to follow growth while streaming
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    // --- Speed selection ---
    // If in timed mode, compute step to finish exactly at timedEndTs.
    // Otherwise, use accel → maxSpeed ramp.
    let step: number;

    if (this.timedEndTs) {
      const remainingSec = Math.max(0, (this.timedEndTs - now) / 1000);

      if (remainingSec <= 0) {
        step = distance; // snap to bottom this frame
        this.timedEndTs = null; // clear timed mode once we arrive
      } else {
        // proportion of remaining distance to move this frame
        step = Math.max(this.cfg.minStep, distance * (dt / remainingSec));

        // If you prefer respecting a max speed cap during timed mode, uncomment:
        // step = Math.min(step, this.cfg.maxSpeed * Math.max(dt, 1/1000));
      }
    } else {
      // accelerate toward max (regular auto mode)
      if (dt > 0) {
        const accel = (this.cfg.maxSpeed - this.cfg.minSpeed) / Math.max(0.001, this.cfg.rampSeconds);
        this.curSpeed = Math.min(this.cfg.maxSpeed, this.curSpeed + accel * dt);
      } else if (this.curSpeed < this.cfg.minSpeed) {
        this.curSpeed = this.cfg.minSpeed;
      }
      const v = dt > 0 ? this.curSpeed : this.cfg.minSpeed;
      step = Math.max(this.cfg.minStep, v * Math.max(dt, 0));
    }

    // clamp to remaining distance
    const nextTop = currentTop + Math.min(step, distance);

    this.programmatic = true;
    el.scrollTop = nextTop;

    this.updateScrollButton();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private distanceFromBottom(): number {
    const el = this.el!;
    return el.scrollHeight - el.scrollTop - el.clientHeight;
  }

  private isNearBottom(): boolean {
    if (!this.isScrollable()) return true;
    return this.distanceFromBottom() <= this.cfg.margin;
  }

  private isScrollable(): boolean {
    const el = this.el!;
    return !!el && (el.scrollHeight > el.clientHeight + 4);
  }

  private updateScrollButton(): void {
    const visible = this.el
      ? (this.isScrollable() && this.distanceFromBottom() > this.cfg.margin)
      : false;
    this._showScrollButton.set(visible);
  }

  ngOnDestroy(): void {
    this.detach();
  }
}
