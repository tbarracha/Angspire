import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BubbleComponent, Bubble } from './bubble.component';

interface BubbleWithMotion extends Bubble {
  vx: number;
  swaySeed: number;
  swaySpeed: number;
  isHard: boolean;
}

@Component({
  selector: 'app-bubble-popper-page',
  standalone: true,
  imports: [CommonModule, BubbleComponent],
  template: `
    <div #container
      class="relative w-full h-full rounded-xl overflow-hidden border bg-background text-card-contrast border-border shadow-2xl"
      style="height: 400px;"
    >
      <div class="absolute top-3 right-6 text-lg font-bold z-10 select-none text-primary">
        Score: {{ score }}
      </div>
      <div *ngIf="running" class="absolute top-3 left-6 flex gap-2 z-10">
        <button
          (click)="togglePause()"
          class="px-4 py-1 rounded-full bg-secondary text-secondary-contrast shadow font-semibold text-sm transition hover:bg-secondary/90 active:scale-95"
        >
          {{ paused ? 'Resume' : 'Pause' }}
        </button>
        <button
          (click)="stopGame(true)"
          class="px-4 py-1 rounded-full bg-error text-error-contrast shadow font-semibold text-sm transition hover:bg-error/90 active:scale-95"
        >
          Stop
        </button>
      </div>
      <button
        *ngIf="!running"
        (click)="startGame()"
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 rounded-full shadow font-bold z-20 transition bg-accent text-accent-contrast hover:bg-accent/80 active:scale-95"
      >
        Start
      </button>
      <ng-container *ngFor="let bubble of bubbles">
        <app-bubble
          [id]="bubble.id"
          [x]="bubble.x"
          [y]="bubble.y"
          [color]="bubble.color"
          [size]="bubble.size"
          (popped)="popBubble($event)"
        ></app-bubble>
      </ng-container>
    </div>
  `,
})
export class BubblePopperPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  containerWidth: number = 360;

  bubbles: BubbleWithMotion[] = [];
  score = 0;
  running = false;
  paused = false;

  private bubbleId = 0;
  private spawnTimer = 0;
  private readonly spawnIntervalMs = 800;
  private lastFrame = 0;
  private animationFrameId: any;
  private gameStartTime = 0;

  ngOnInit() { }

  ngAfterViewInit() {
    this.updateContainerWidth();
    window.addEventListener('resize', this.updateContainerWidth);
  }

  ngOnDestroy() {
    this.stopGame(false);
    window.removeEventListener('resize', this.updateContainerWidth);
  }

  updateContainerWidth = () => {
    if (this.containerRef?.nativeElement) {
      this.containerWidth = this.containerRef.nativeElement.offsetWidth;
    }
  };

  startGame() {
    this.score = 0;
    this.bubbles = [];
    this.running = true;
    this.paused = false;
    this.bubbleId = 0;
    this.spawnTimer = 0;
    this.lastFrame = performance.now();
    this.gameStartTime = this.lastFrame;
    this.updateContainerWidth();
    this.runAnimationLoop();
  }

  stopGame(reset: boolean = true) {
    this.running = false;
    this.paused = false;
    cancelAnimationFrame(this.animationFrameId);
    if (reset) {
      this.score = 0;
      this.bubbles = [];
    }
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused && this.running) {
      this.lastFrame = performance.now();
      this.runAnimationLoop();
    }
  }

  runAnimationLoop = (now: number = performance.now()) => {
    if (!this.running) return;
    const delta = now - this.lastFrame;
    this.lastFrame = now;

    if (!this.paused) {
      this.moveBubbles(delta);

      this.spawnTimer += delta;
      if (this.spawnTimer > this.spawnIntervalMs) {
        this.spawnBubble();
        this.spawnTimer = 0;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
  };

  getDifficulty(): number {
    if (!this.running) return 0;
    const elapsed = this.lastFrame - this.gameStartTime;
    // 0 at start, 1 at 30s (30,000 ms)
    return Math.min(1, elapsed / 30000);
  }

  spawnBubble() {
    const width = this.containerWidth;
    const size = 32 + Math.random() * 24;
    const difficulty = this.getDifficulty();

    // Probability that a bubble is "hard" increases from 10% to 80% over 30s
    const hardProb = 0.1 + 0.7 * difficulty;
    const isHard = Math.random() < hardProb;

    // EASY bubble (default: gentle, low vx, low sway, low random accel)
    // HARD bubble (can use full scale values)
    let maxVx, swayAmp, randAccel, swaySpeed;
    if (isHard) {
      maxVx = 1 + 5 * difficulty;          // up to ±6 px/frame
      swayAmp = 1.5 + 14.5 * difficulty;   // up to 16px
      randAccel = 0.03 + 0.19 * difficulty;// up to 0.22
      swaySpeed = 0.8 + Math.random() * 1.2;
    } else {
      maxVx = 0.7 + 1.3 * (1 - Math.random()) * (1 - difficulty);  // mostly ±0.7 to ±2 px/frame
      swayAmp = 1.5 + 3 * Math.random();      // 1.5px to 4.5px
      randAccel = 0.01 + 0.03 * Math.random(); // 0.01 to 0.04
      swaySpeed = 0.7 + Math.random() * 0.5;
    }

    const vx = (Math.random() - 0.5) * 2 * maxVx;
    const swaySeed = Math.random() * Math.PI * 2;

    this.bubbles.push({
      id: this.bubbleId++,
      x: Math.random() * (width - size),
      y: 0,
      color: this.randomColor(),
      size,
      vx,
      swaySeed,
      swaySpeed,
      isHard,
    });
  }

  moveBubbles(delta: number = 16.6) {
    const height = 400;
    const width = this.containerWidth;
    const offset = 40;
    const difficulty = this.getDifficulty();

    for (const bubble of this.bubbles) {
      // Set params based on bubble type
      let swayAmp, randAccel, maxVx;
      if (bubble.isHard) {
        swayAmp = 1.5 + 14.5 * difficulty;
        randAccel = 0.03 + 0.19 * difficulty;
        maxVx = 1 + 4 * difficulty;
      } else {
        swayAmp = 1.5 + 3 * Math.random();
        randAccel = 0.01 + 0.03 * Math.random();
        maxVx = 0.7 + 1.3 * (1 - Math.random()) * (1 - difficulty);
      }

      const sway =
        Math.sin((performance.now() / (170 / bubble.swaySpeed)) + bubble.swaySeed) *
        swayAmp * (delta / 16.6);

      bubble.vx += (Math.random() - 0.5) * randAccel * (delta / 16.6);
      bubble.vx = Math.max(-maxVx, Math.min(maxVx, bubble.vx));
      bubble.x += (bubble.vx + sway) * (delta / 16.6);

      // Clamp horizontal position to within game area
      bubble.x = Math.max(-offset, Math.min(bubble.x, width - bubble.size + offset));

      const baseSpeed = 4 + Math.random() * 2;
      bubble.y += baseSpeed * (delta / 50);
    }
    this.bubbles = this.bubbles.filter((b) => b.y < height + 40);
  }

  popBubble(id: number) {
    // Prevent popping when paused or not running
    if (!this.running || this.paused) return;
    this.bubbles = this.bubbles.filter((b) => b.id !== id);
    this.score += 1;
  }

  randomColor() {
    const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#F06292', '#BA68C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
