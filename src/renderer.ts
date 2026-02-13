import type { Constellation } from './constellation';
import { starToPixel, pixelToStar } from './constellation';

interface RenderState {
  revealedCount: number;
  prevRevealedCount: number; // track when a new star appears for flash
  starAlphas: number[];
  starFlash: number[];       // 0-1 bright flash that decays when star first appears
  activeIndex: number;
  readStars: Set<number>;
  allRevealed: boolean;
  hoveredStar: number | null;
  tooltipOpacity: number;
  lastHovered: number | null;
  lineProgress: number[];
  completed: boolean;
}

export class ConstellationRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private constellation: Constellation | null = null;
  private state: RenderState = this.freshState();
  private animId = 0;
  private time = 0;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private onRevealComplete?: () => void;
  private onAllRead?: () => void;

  // Drag mode
  private dragEnabled = false;
  private draggingIndex: number | null = null;
  private onDragMove?: (positions: [number, number][]) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.dragEnabled) {
        this.handleDragMove(e);
      } else {
        this.checkHover(e.clientX, e.clientY);
      }
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.dragEnabled) this.handleDragStart(e);
    });
    this.canvas.addEventListener('mouseup', () => {
      if (this.dragEnabled) this.handleDragEnd();
    });
    this.canvas.addEventListener('mouseleave', () => {
      if (this.dragEnabled) this.handleDragEnd();
    });

    // Touch drag support
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.dragEnabled && e.touches.length > 0) {
        this.handleDragStart(e.touches[0] as unknown as MouseEvent);
      } else if (e.touches.length > 0) {
        this.handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (this.dragEnabled && e.touches.length > 0) {
        this.handleDragMove(e.touches[0] as unknown as MouseEvent);
      }
    }, { passive: true });
    this.canvas.addEventListener('touchend', () => {
      if (this.dragEnabled) this.handleDragEnd();
    }, { passive: true });

    this.canvas.addEventListener('click', (e) => {
      if (!this.dragEnabled) this.handleInteraction(e.clientX, e.clientY);
    });
  }

  private freshState(): RenderState {
    return {
      revealedCount: 0,
      prevRevealedCount: 0,
      starAlphas: [],
      starFlash: [],
      activeIndex: 0,
      readStars: new Set(),
      allRevealed: false,
      hoveredStar: null,
      tooltipOpacity: 0,
      lastHovered: null,
      lineProgress: [],
      completed: false,
    };
  }

  enableDrag(onDragMove: (positions: [number, number][]) => void) {
    this.dragEnabled = true;
    this.onDragMove = onDragMove;
    this.canvas.style.cursor = 'grab';
  }

  disableDrag() {
    this.dragEnabled = false;
    this.draggingIndex = null;
    this.onDragMove = undefined;
    this.canvas.style.cursor = 'default';
  }

  private getCanvasCoords(e: MouseEvent): { cx: number; cy: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      cx: e.clientX - rect.left,
      cy: e.clientY - rect.top,
    };
  }

  private handleDragStart(e: MouseEvent) {
    if (!this.constellation) return;
    const { cx, cy } = this.getCanvasCoords(e);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const hitRadius = 20;

    for (let i = 0; i < this.constellation.stars.length; i++) {
      const { px, py } = starToPixel(this.constellation.stars[i], w, h);
      if (Math.hypot(cx - px, cy - py) < hitRadius) {
        this.draggingIndex = i;
        this.canvas.style.cursor = 'grabbing';
        return;
      }
    }
  }

  private handleDragMove(e: MouseEvent) {
    if (!this.constellation) return;
    const { cx, cy } = this.getCanvasCoords(e);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    if (this.draggingIndex !== null) {
      const star = this.constellation.stars[this.draggingIndex];
      const norm = pixelToStar(cx, cy, w, h);
      star.x = Math.max(0.05, Math.min(0.95, norm.x));
      star.y = Math.max(0.05, Math.min(0.95, norm.y));
      this.canvas.style.cursor = 'grabbing';

      if (this.onDragMove) {
        const positions: [number, number][] = this.constellation.stars.map(s => [s.x, s.y]);
        this.onDragMove(positions);
      }
    } else {
      // Check hover for grab cursor
      let overStar = false;
      for (let i = 0; i < this.constellation.stars.length; i++) {
        const { px, py } = starToPixel(this.constellation.stars[i], w, h);
        if (Math.hypot(cx - px, cy - py) < 20) {
          overStar = true;
          break;
        }
      }
      this.canvas.style.cursor = overStar ? 'grab' : 'default';
    }
  }

  private handleDragEnd() {
    if (this.draggingIndex !== null) {
      this.draggingIndex = null;
      this.canvas.style.cursor = 'grab';
    }
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setConstellation(constellation: Constellation, onRevealComplete?: () => void, onAllRead?: () => void) {
    this.constellation = constellation;
    this.onRevealComplete = onRevealComplete;
    this.onAllRead = onAllRead;
    const s = this.freshState();
    s.starAlphas = new Array(constellation.stars.length).fill(0);
    s.starFlash = new Array(constellation.stars.length).fill(0);
    s.lineProgress = new Array(Math.max(0, constellation.stars.length - 1)).fill(0);
    this.state = s;
  }

  startRevealSequence(delayMs = 800) {
    if (!this.constellation) return;
    let i = 0;
    const reveal = () => {
      if (!this.constellation || i >= this.constellation.stars.length) {
        this.state.allRevealed = true;
        if (this.onRevealComplete) this.onRevealComplete();
        return;
      }
      this.state.revealedCount = i + 1;
      i++;
      this.revealTimer = setTimeout(reveal, delayMs);
    };
    this.revealTimer = setTimeout(reveal, delayMs);
  }

  startRenderLoop() {
    const draw = () => {
      this.time++;
      this.render();
      this.animId = requestAnimationFrame(draw);
    };
    draw();
  }

  private render() {
    if (!this.constellation) return;
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const style = getComputedStyle(document.documentElement);
    const starColor = style.getPropertyValue('--star-color').trim();
    const starGlow = style.getPropertyValue('--star-glow').trim();
    const lineColor = style.getPropertyValue('--line-color').trim();
    const { allRevealed, activeIndex, readStars, completed } = this.state;

    ctx.clearRect(0, 0, w, h);

    // Detect newly revealed stars and trigger flash
    if (this.state.revealedCount > this.state.prevRevealedCount) {
      for (let i = this.state.prevRevealedCount; i < this.state.revealedCount; i++) {
        this.state.starFlash[i] = 1.0; // full flash
      }
      this.state.prevRevealedCount = this.state.revealedCount;
    }

    // Animate star alphas and decay flashes
    for (let i = 0; i < this.constellation.stars.length; i++) {
      const target = i < this.state.revealedCount ? 1 : 0;
      this.state.starAlphas[i] += (target - this.state.starAlphas[i]) * 0.04;
      // Flash decays over time
      this.state.starFlash[i] *= 0.96;
    }

    // Animate line progress for read connections
    for (let i = 0; i < this.state.lineProgress.length; i++) {
      // Line i connects star i to star i+1
      // Show it once star i has been read (meaning user tapped it and moved to next)
      const shouldShow = readStars.has(i) && readStars.has(i + 1) ? 1 :
                          readStars.has(i) && activeIndex === i + 1 ? 1 : 0;
      const target = completed ? 1 : shouldShow;
      this.state.lineProgress[i] += (target - this.state.lineProgress[i]) * 0.06;
    }

    // Draw connection lines (only between sequential stars that have been read)
    for (let i = 0; i < this.state.lineProgress.length; i++) {
      const progress = this.state.lineProgress[i];
      if (progress < 0.01) continue;

      const starA = this.constellation.stars[i];
      const starB = this.constellation.stars[i + 1];
      const a = starToPixel(starA, w, h);
      const b = starToPixel(starB, w, h);

      // Animate the line drawing from A toward B
      const endX = a.px + (b.px - a.px) * progress;
      const endY = a.py + (b.py - a.py) * progress;

      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(endX, endY);
      const lineAlpha = completed ? 0.3 : 0.5;
      ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/, `${lineAlpha})`);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw stars
    for (let i = 0; i < this.constellation.stars.length; i++) {
      const star = this.constellation.stars[i];
      const { px, py } = starToPixel(star, w, h);
      const baseAlpha = this.state.starAlphas[i];
      if (baseAlpha < 0.01) continue;

      const isActive = allRevealed && !completed && i === activeIndex;
      const isRead = readStars.has(i);
      const isHovered = this.state.hoveredStar === i;

      // Determine visual intensity based on state
      let intensity: number;
      if (completed) {
        // All done: every star glows evenly
        intensity = 0.8;
      } else if (isActive) {
        // The beacon: strong pulse to attract attention
        intensity = 1.0;
      } else if (isRead) {
        // Already read: dimmer but visible
        intensity = 0.45;
      } else if (!allRevealed) {
        // During reveal sequence: normal
        intensity = 0.7;
      } else {
        // Unread and not active: very dim
        intensity = 0.15;
      }

      const alpha = baseAlpha * intensity;

      // Pulse — active star pulses much more dramatically
      const pulseSpeed = isActive ? 0.06 : 0.03;
      const pulseAmount = isActive ? 0.4 : 0.15;
      const pulse = Math.sin(this.time * pulseSpeed + i) * pulseAmount;

      const baseRadius = 3 * star.size;
      const activeBonus = isActive ? 3 : isHovered ? 2 : 0;
      const radius = baseRadius + pulse + activeBonus;

      // Flash burst — dramatic entrance when star first appears
      const flash = this.state.starFlash[i];
      if (flash > 0.05) {
        const flashRadius = radius * (12 + (1 - flash) * 20); // expands outward
        const flashGrad = ctx.createRadialGradient(px, py, 0, px, py, flashRadius);
        flashGrad.addColorStop(0, this.withAlpha('#ffffff', flash * 0.6));
        flashGrad.addColorStop(0.2, this.withAlpha(starGlow, flash * 0.3));
        flashGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flashGrad;
        ctx.fillRect(px - flashRadius, py - flashRadius, flashRadius * 2, flashRadius * 2);
      }

      // Outer glow (bigger for active star)
      const glowMult = isActive ? 10 : 6;
      const glowRadius = radius * glowMult;
      const glowAlpha = isActive ? alpha * 0.4 : alpha * 0.2;
      const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
      glowGrad.addColorStop(0, this.withAlpha(starGlow, glowAlpha));
      glowGrad.addColorStop(0.3, this.withAlpha(starGlow, glowAlpha * 0.4));
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(px - glowRadius, py - glowRadius, glowRadius * 2, glowRadius * 2);

      // Inner star
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.withAlpha(starColor, alpha * (0.8 + pulse * 0.2));
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = this.withAlpha('#ffffff', alpha * 0.9);
      ctx.fill();

      // "Begin here" ring for first active star if nothing read yet
      if (isActive && readStars.size === 0) {
        const ringAlpha = (Math.sin(this.time * 0.04) * 0.3 + 0.5) * baseAlpha;
        ctx.beginPath();
        ctx.arc(px, py, radius + 8 + Math.sin(this.time * 0.03) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = this.withAlpha(starGlow, ringAlpha * 0.4);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw tooltip for hovered star (only if it's the active one or already read)
    const showTooltipFor = this.state.hoveredStar;
    if (showTooltipFor !== null && (readStars.has(showTooltipFor) || showTooltipFor === activeIndex || completed)) {
      this.state.lastHovered = showTooltipFor;
      this.state.tooltipOpacity = Math.min(1, this.state.tooltipOpacity + 0.06);
      this.drawTooltip(ctx, w, h);
    } else {
      this.state.tooltipOpacity = Math.max(0, this.state.tooltipOpacity - 0.08);
      if (this.state.tooltipOpacity > 0.01 && this.state.lastHovered !== null) {
        this.drawTooltip(ctx, w, h);
      }
    }
  }

  private drawTooltip(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const starIdx = this.state.hoveredStar ?? this.state.lastHovered;
    if (!this.constellation || starIdx === null) return;
    const star = this.constellation.stars[starIdx];
    const { px, py } = starToPixel(star, w, h);
    const text = star.sentence;
    const alpha = this.state.tooltipOpacity;

    ctx.save();
    ctx.font = `italic 300 ${Math.max(16, Math.min(22, w * 0.022))}px 'Cormorant Garamond', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const maxWidth = w * 0.7;

    const yOffset = py < h * 0.25 ? 40 : -30;
    const textY = py + yOffset;
    const textX = Math.max(textWidth / 2 + 20, Math.min(px, w - textWidth / 2 - 20));

    const padX = 20;
    const pillW = Math.min(textWidth + padX * 2, maxWidth + padX * 2);
    const pillH = 36;
    const pillX = textX - pillW / 2;
    const pillY = textY - pillH + 5;
    ctx.fillStyle = `rgba(10, 10, 26, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 18);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.92})`;
    ctx.fillText(text, textX, textY, maxWidth);
    ctx.restore();
  }

  private checkHover(mx: number, my: number) {
    if (!this.constellation) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    mx -= rect.left;
    my -= rect.top;
    const hitRadius = 30;

    let found: number | null = null;
    for (let i = 0; i < this.constellation.stars.length; i++) {
      if (this.state.starAlphas[i] < 0.3) continue;
      const { px, py } = starToPixel(this.constellation.stars[i], w, h);
      if (Math.hypot(mx - px, my - py) < hitRadius) {
        found = i;
        break;
      }
    }
    this.state.hoveredStar = found;

    // Show pointer only for active/read stars
    const canInteract = found !== null && (
      found === this.state.activeIndex ||
      this.state.readStars.has(found) ||
      this.state.completed
    );
    this.canvas.style.cursor = canInteract ? 'pointer' : 'default';
  }

  private handleInteraction(mx: number, my: number) {
    if (!this.constellation || !this.state.allRevealed) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    mx -= rect.left;
    my -= rect.top;
    const hitRadius = 30;

    for (let i = 0; i < this.constellation.stars.length; i++) {
      if (this.state.starAlphas[i] < 0.3) continue;
      const { px, py } = starToPixel(this.constellation.stars[i], w, h);
      if (Math.hypot(mx - px, my - py) < hitRadius) {
        // If they tapped the active star, mark it read and advance
        if (i === this.state.activeIndex && !this.state.completed) {
          this.state.readStars.add(i);
          this.state.hoveredStar = i;
          this.state.lastHovered = i;
          this.state.tooltipOpacity = 1;

          // Advance to next unread star
          const next = this.state.activeIndex + 1;
          if (next < this.constellation.stars.length) {
            this.state.activeIndex = next;
          } else {
            // All stars read!
            this.state.completed = true;
            if (this.onAllRead) this.onAllRead();
          }
        }
        break;
      }
    }
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }

  triggerResize() {
    this.resize();
  }

  stop() {
    cancelAnimationFrame(this.animId);
    if (this.revealTimer) clearTimeout(this.revealTimer);
  }
}
