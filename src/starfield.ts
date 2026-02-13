interface BgStar {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
}

export class StarField {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: BgStar[] = [];
  private shootingStars: ShootingStar[] = [];
  private animId = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.generateStars();
    window.addEventListener('resize', () => {
      this.resize();
      this.generateStars();
    });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private generateStars() {
    const count = Math.floor((window.innerWidth * window.innerHeight) / 3000);
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private maybeSpawnShootingStar() {
    if (Math.random() < 0.002 && this.shootingStars.length < 2) {
      const angle = Math.PI * 0.2 + Math.random() * Math.PI * 0.15;
      const speed = 4 + Math.random() * 4;
      this.shootingStars.push({
        x: Math.random() * window.innerWidth * 0.8,
        y: Math.random() * window.innerHeight * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        length: 40 + Math.random() * 60,
      });
    }
  }

  start() {
    const draw = () => {
      this.time++;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ctx = this.ctx;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(0.5, '#0f0f2e');
      grad.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      this.drawNebula(ctx, w * 0.3, h * 0.25, w * 0.4);
      this.drawNebula(ctx, w * 0.75, h * 0.65, w * 0.35);

      for (const star of this.stars) {
        const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.opacity + twinkle * 0.15;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`;
        ctx.fill();
      }

      this.maybeSpawnShootingStar();
      this.shootingStars = this.shootingStars.filter(s => s.life < s.maxLife);
      for (const s of this.shootingStars) {
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.1 ? progress * 10 : 1 - progress;
        const mag = Math.hypot(s.vx, s.vy);
        const tailX = s.x - (s.vx / mag) * s.length * (1 - progress);
        const tailY = s.y - (s.vy / mag) * s.length * (1 - progress);
        const gradient = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.7})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      this.animId = requestAnimationFrame(draw);
    };
    draw();
  }

  private drawNebula(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    const style = getComputedStyle(document.documentElement);
    const nebula1 = style.getPropertyValue('--nebula-1').trim() || 'rgba(90,40,80,0.08)';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, nebula1);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  stop() {
    cancelAnimationFrame(this.animId);
  }
}
