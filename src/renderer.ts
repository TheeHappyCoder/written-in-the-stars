import type { Constellation } from './constellation';
import { starToPixel } from './constellation';

interface RenderState {
  revealedCount: number;
  starAlphas: number[];
  lineAlphas: number[];
  hoveredStar: number | null;
  tooltipOpacity: number;
  lastHovered: number | null;
}

export class ConstellationRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private constellation: Constellation | null = null;
  private state: RenderState = {
    revealedCount: 0,
    starAlphas: [],
    lineAlphas: [],
    hoveredStar: null,
    tooltipOpacity: 0,
    lastHovered: null,
  };
  private animId = 0;
  private time = 0;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private onRevealComplete?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => this.checkHover(e.clientX, e.clientY));
    this.canvas.addEventListener('click', (e) => this.checkHover(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.checkHover(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setConstellation(constellation: Constellation, onRevealComplete?: () => void) {
    this.constellation = constellation;
    this.onRevealComplete = onRevealComplete;
    this.state = {
      revealedCount: 0,
      starAlphas: new Array(constellation.stars.length).fill(0),
      lineAlphas: new Array(constellation.connections.length).fill(0),
      hoveredStar: null,
      tooltipOpacity: 0,
      lastHovered: null,
    };
  }

  startRevealSequence(delayMs = 800) {
    if (!this.constellation) return;
    let i = 0;
    const reveal = () => {
      if (!this.constellation || i >= this.constellation.stars.length) {
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
    const w = window.innerWidth;
    const h = window.innerHeight;
    const style = getComputedStyle(document.documentElement);
    const starColor = style.getPropertyValue('--star-color').trim();
    const starGlow = style.getPropertyValue('--star-glow').trim();
    const lineColor = style.getPropertyValue('--line-color').trim();

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.constellation.stars.length; i++) {
      const target = i < this.state.revealedCount ? 1 : 0;
      this.state.starAlphas[i] += (target - this.state.starAlphas[i]) * 0.04;
    }

    for (let i = 0; i < this.constellation.connections.length; i++) {
      const [a, b] = this.constellation.connections[i];
      const target = this.state.starAlphas[a] > 0.5 && this.state.starAlphas[b] > 0.5 ? 1 : 0;
      this.state.lineAlphas[i] += (target - this.state.lineAlphas[i]) * 0.03;
    }

    // Draw connections
    for (let i = 0; i < this.constellation.connections.length; i++) {
      const [aIdx, bIdx] = this.constellation.connections[i];
      const a = starToPixel(this.constellation.stars[aIdx], w, h);
      const b = starToPixel(this.constellation.stars[bIdx], w, h);
      const alpha = this.state.lineAlphas[i];
      if (alpha < 0.01) continue;

      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/, `${alpha * 0.4})`);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw stars
    for (let i = 0; i < this.constellation.stars.length; i++) {
      const star = this.constellation.stars[i];
      const { px, py } = starToPixel(star, w, h);
      const alpha = this.state.starAlphas[i];
      if (alpha < 0.01) continue;

      const isHovered = this.state.hoveredStar === i;
      const pulse = Math.sin(this.time * 0.03 + i) * 0.15;
      const baseRadius = 3 * star.size;
      const radius = baseRadius + pulse + (isHovered ? 2 : 0);

      // Outer glow
      const glowRadius = radius * 6;
      const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
      glowGrad.addColorStop(0, this.withAlpha(starGlow, alpha * 0.25));
      glowGrad.addColorStop(0.4, this.withAlpha(starGlow, alpha * 0.08));
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
    }

    // Draw tooltip
    if (this.state.hoveredStar !== null) {
      this.state.lastHovered = this.state.hoveredStar;
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

    // Background pill
    const padX = 20;
    const pillW = Math.min(textWidth + padX * 2, maxWidth + padX * 2);
    const pillH = 36;
    const pillX = textX - pillW / 2;
    const pillY = textY - pillH + 5;
    ctx.fillStyle = `rgba(10, 10, 26, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 18);
    ctx.fill();

    // Text
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.92})`;
    ctx.fillText(text, textX, textY, maxWidth);
    ctx.restore();
  }

  private checkHover(mx: number, my: number) {
    if (!this.constellation) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const hitRadius = 25;

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
    this.canvas.style.cursor = found !== null ? 'pointer' : 'default';
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

  stop() {
    cancelAnimationFrame(this.animId);
    if (this.revealTimer) clearTimeout(this.revealTimer);
  }
}
