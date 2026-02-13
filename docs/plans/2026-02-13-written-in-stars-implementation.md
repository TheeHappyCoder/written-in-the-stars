# Written in Stars — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Valentine's Day web experience where love messages become interactive constellations in a night sky.

**Architecture:** Single-page app with two views (create + view) routed via URL. Message data encoded in URL query params via LZ-string compression. Canvas renders the star field and constellation. Vanilla TypeScript, no framework.

**Tech Stack:** Vite, TypeScript, HTML Canvas, LZ-string, CSS animations, Web Share API, Google Fonts (Cormorant Garamond + Inter)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.ts`, `src/style.css`

**Step 1: Scaffold Vite project**

Run from `C:\Apps\written-in-stars`:
```bash
npm create vite@latest . -- --template vanilla-ts
```
Select: overwrite existing files if prompted.

**Step 2: Install dependencies**

```bash
npm install
npm install lz-string
npm install -D @types/lz-string
```

**Step 3: Verify dev server starts**

```bash
npm run dev
```
Expected: Dev server starts on localhost, default Vite page loads.

**Step 4: Clean out default Vite boilerplate**

Replace `index.html` with:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Someone wrote you a constellation." />
  <title>Written in Stars</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body>
  <div id="app"></div>
  <canvas id="bg-canvas"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Replace `src/style.css` with base styles:
```css
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --font-serif: 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Inter', -apple-system, sans-serif;

  /* Theme: warm gold (default) */
  --star-color: #ffd685;
  --star-glow: #ffc14d;
  --line-color: rgba(255, 214, 133, 0.15);
  --accent: #ffd685;
  --bg-deep: #0a0a1a;
  --bg-mid: #0f0f2e;
  --nebula-1: rgba(90, 40, 80, 0.08);
  --nebula-2: rgba(60, 30, 90, 0.06);
  --text-primary: rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-dim: rgba(255, 255, 255, 0.3);
}

/* Theme: rose quartz */
.theme-rose {
  --star-color: #f4a0b5;
  --star-glow: #e87a9a;
  --line-color: rgba(244, 160, 181, 0.15);
  --accent: #f4a0b5;
  --nebula-1: rgba(120, 40, 60, 0.1);
  --nebula-2: rgba(80, 20, 60, 0.08);
}

/* Theme: arctic blue */
.theme-arctic {
  --star-color: #8ec8e8;
  --star-glow: #5eaad4;
  --line-color: rgba(142, 200, 232, 0.12);
  --accent: #8ec8e8;
  --nebula-1: rgba(30, 50, 100, 0.1);
  --nebula-2: rgba(20, 40, 80, 0.08);
}

/* Theme: aurora */
.theme-aurora {
  --star-color: #8ee8b5;
  --star-glow: #5ed4a0;
  --line-color: rgba(142, 232, 181, 0.12);
  --accent: #8ee8b5;
  --nebula-1: rgba(20, 80, 60, 0.1);
  --nebula-2: rgba(40, 60, 100, 0.08);
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

#bg-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

#app {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}
```

Replace `src/main.ts` with:
```typescript
import './style.css';

function getRoute(): 'create' | 'view' {
  const params = new URLSearchParams(window.location.search);
  return params.has('d') ? 'view' : 'create';
}

function init() {
  const route = getRoute();
  console.log(`Route: ${route}`);
  // Views will be initialized in later tasks
}

init();
```

**Step 5: Verify clean slate loads**

```bash
npm run dev
```
Expected: Dark page, no errors in console, "Route: create" logged.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite project with base styles and themes"
```

---

### Task 2: Data Encoding & Decoding

**Files:**
- Create: `src/data.ts`
- Create: `src/data.test.ts`

**Step 1: Write the data module**

Create `src/data.ts`:
```typescript
import LZString from 'lz-string';

export interface ConstellationData {
  to: string;
  from: string;
  message: string;
  theme: 'gold' | 'rose' | 'arctic' | 'aurora';
}

export function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation, or by newlines, keeping it natural
  const raw = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // If no punctuation splits happened, split by commas or just return as one
  if (raw.length <= 1 && text.length > 80) {
    const bySemiOrComma = text
      .split(/[;]\s*|,\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (bySemiOrComma.length > 1) return bySemiOrComma;
  }

  // If still just one chunk and it's long, split roughly by word groups
  if (raw.length === 1 && raw[0].length > 120) {
    const words = raw[0].split(/\s+/);
    const chunks: string[] = [];
    const chunkSize = Math.ceil(words.length / Math.ceil(words.length / 12));
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks;
  }

  return raw.length > 0 ? raw : [text.trim()];
}

export function encode(data: ConstellationData): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

export function decode(encoded: string): ConstellationData | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data.to || !data.from || !data.message || !data.theme) return null;
    return data as ConstellationData;
  } catch {
    return null;
  }
}

export function buildShareURL(data: ConstellationData): string {
  const encoded = encode(data);
  return `${window.location.origin}${window.location.pathname}?d=${encoded}`;
}
```

**Step 2: Install Vitest and write tests**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

Create `src/data.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { encode, decode, splitSentences, ConstellationData } from './data';

describe('encode/decode', () => {
  it('round-trips data correctly', () => {
    const data: ConstellationData = {
      to: 'Sarah',
      from: 'Mark',
      message: 'You are my sunshine. You make me happy.',
      theme: 'gold',
    };
    const encoded = encode(data);
    const decoded = decode(encoded);
    expect(decoded).toEqual(data);
  });

  it('returns null for invalid input', () => {
    expect(decode('')).toBeNull();
    expect(decode('garbage')).toBeNull();
  });

  it('returns null for missing fields', () => {
    const partial = JSON.stringify({ to: 'A' });
    // LZ compress partial
    const LZString = require('lz-string');
    const encoded = LZString.compressToEncodedURIComponent(partial);
    expect(decode(encoded)).toBeNull();
  });
});

describe('splitSentences', () => {
  it('splits on periods', () => {
    const result = splitSentences('I love you. You are amazing. Never change.');
    expect(result).toEqual(['I love you.', 'You are amazing.', 'Never change.']);
  });

  it('splits on exclamation and question marks', () => {
    const result = splitSentences('Do you know? I love you! So much.');
    expect(result).toEqual(['Do you know?', 'I love you!', 'So much.']);
  });

  it('handles single sentence', () => {
    const result = splitSentences('I love you');
    expect(result).toEqual(['I love you']);
  });

  it('splits on newlines', () => {
    const result = splitSentences('Line one\nLine two\nLine three');
    expect(result).toEqual(['Line one', 'Line two', 'Line three']);
  });

  it('filters empty strings', () => {
    const result = splitSentences('Hello.  . World.');
    expect(result.every(s => s.length > 0)).toBe(true);
  });
});
```

**Step 3: Run tests**

```bash
npm test
```
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/data.ts src/data.test.ts package.json package-lock.json
git commit -m "feat: add data encoding/decoding with LZ-string compression"
```

---

### Task 3: Seeded PRNG & Constellation Algorithm

**Files:**
- Create: `src/constellation.ts`
- Create: `src/constellation.test.ts`

**Step 1: Write the constellation algorithm**

Create `src/constellation.ts`:
```typescript
// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export interface Star {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  size: number; // relative size multiplier
  sentence: string;
}

export interface Constellation {
  stars: Star[];
  connections: [number, number][]; // pairs of star indices
}

export function generateConstellation(
  sentences: string[],
  width: number,
  height: number
): Constellation {
  const seed = hashString(sentences.join(''));
  const rng = mulberry32(seed);

  const padding = 0.12; // keep stars away from edges
  const minDist = 0.15; // minimum distance between stars (normalized)

  const stars: Star[] = [];

  for (const sentence of sentences) {
    let x: number, y: number;
    let attempts = 0;

    // Try to place star with minimum distance from others
    do {
      x = padding + rng() * (1 - 2 * padding);
      y = padding + rng() * (1 - 2 * padding);
      attempts++;
    } while (
      attempts < 100 &&
      stars.some(s => Math.hypot(s.x - x, s.y - y) < minDist)
    );

    const wordCount = sentence.split(/\s+/).length;
    const size = 0.7 + Math.min(wordCount / 15, 0.6); // longer sentences = slightly bigger stars

    stars.push({ x, y, size, sentence });
  }

  // Connect stars sequentially (1->2->3->...)
  const connections: [number, number][] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    connections.push([i, i + 1]);
  }

  // Add a couple cross-connections for visual interest if enough stars
  if (stars.length >= 4) {
    connections.push([0, Math.floor(stars.length / 2)]);
  }
  if (stars.length >= 6) {
    connections.push([Math.floor(stars.length / 3), stars.length - 1]);
  }

  return { stars, connections };
}

// Convert normalized coordinates to canvas pixels
export function starToPixel(
  star: Star,
  canvasWidth: number,
  canvasHeight: number
): { px: number; py: number } {
  return {
    px: star.x * canvasWidth,
    py: star.y * canvasHeight,
  };
}
```

**Step 2: Write tests**

Create `src/constellation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateConstellation } from './constellation';

describe('generateConstellation', () => {
  const sentences = [
    'I love you.',
    'You are my sunshine.',
    'Never change.',
    'You make every day better.',
  ];

  it('creates one star per sentence', () => {
    const result = generateConstellation(sentences, 800, 600);
    expect(result.stars).toHaveLength(4);
  });

  it('stars have valid normalized coordinates', () => {
    const result = generateConstellation(sentences, 800, 600);
    for (const star of result.stars) {
      expect(star.x).toBeGreaterThan(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThan(0);
      expect(star.y).toBeLessThan(1);
    }
  });

  it('is deterministic (same input = same output)', () => {
    const a = generateConstellation(sentences, 800, 600);
    const b = generateConstellation(sentences, 800, 600);
    expect(a.stars.map(s => [s.x, s.y])).toEqual(b.stars.map(s => [s.x, s.y]));
  });

  it('different messages produce different constellations', () => {
    const a = generateConstellation(sentences, 800, 600);
    const b = generateConstellation(['Different.', 'Message.', 'Here.', 'Now.'], 800, 600);
    const posA = a.stars.map(s => `${s.x.toFixed(4)},${s.y.toFixed(4)}`).join('|');
    const posB = b.stars.map(s => `${s.x.toFixed(4)},${s.y.toFixed(4)}`).join('|');
    expect(posA).not.toEqual(posB);
  });

  it('creates sequential connections', () => {
    const result = generateConstellation(sentences, 800, 600);
    // Should have at least n-1 connections for n stars
    expect(result.connections.length).toBeGreaterThanOrEqual(sentences.length - 1);
    // First connection should be [0, 1]
    expect(result.connections[0]).toEqual([0, 1]);
  });

  it('handles a single sentence', () => {
    const result = generateConstellation(['Just one.'], 800, 600);
    expect(result.stars).toHaveLength(1);
    expect(result.connections).toHaveLength(0);
  });
});
```

**Step 3: Run tests**

```bash
npm test
```
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/constellation.ts src/constellation.test.ts
git commit -m "feat: add seeded constellation generation algorithm"
```

---

### Task 4: Background Star Field Canvas

**Files:**
- Create: `src/starfield.ts`

This is purely visual — verified by running dev server.

**Step 1: Write the background star field renderer**

Create `src/starfield.ts`:
```typescript
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

      // Clear with gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(0.5, '#0f0f2e');
      grad.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Nebula glow — subtle radial gradients
      this.drawNebula(ctx, w * 0.3, h * 0.25, w * 0.4);
      this.drawNebula(ctx, w * 0.75, h * 0.65, w * 0.35);

      // Draw background stars
      for (const star of this.stars) {
        const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.opacity + twinkle * 0.15;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`;
        ctx.fill();
      }

      // Shooting stars
      this.maybeSpawnShootingStar();
      this.shootingStars = this.shootingStars.filter(s => s.life < s.maxLife);
      for (const s of this.shootingStars) {
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.1 ? progress * 10 : 1 - progress;
        const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length * (1 - progress);
        const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length * (1 - progress);
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
```

**Step 2: Wire into main.ts**

Update `src/main.ts` to initialize the star field:
```typescript
import './style.css';
import { StarField } from './starfield';

function getRoute(): 'create' | 'view' {
  const params = new URLSearchParams(window.location.search);
  return params.has('d') ? 'view' : 'create';
}

function init() {
  const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  const starField = new StarField(bgCanvas);
  starField.start();

  const route = getRoute();
  console.log(`Route: ${route}`);
}

init();
```

**Step 3: Visual verification**

```bash
npm run dev
```
Expected: Deep navy gradient background with twinkling stars and occasional shooting stars. Nebula glows visible.

**Step 4: Commit**

```bash
git add src/starfield.ts src/main.ts
git commit -m "feat: add animated background star field with nebula and shooting stars"
```

---

### Task 5: Constellation Canvas Renderer

**Files:**
- Create: `src/renderer.ts`

**Step 1: Write the constellation renderer**

Create `src/renderer.ts`:
```typescript
import { Constellation, starToPixel } from './constellation';

interface RenderState {
  revealedCount: number; // how many stars are currently visible
  starAlphas: number[]; // 0-1, animated in
  lineAlphas: number[]; // 0-1, animated in
  hoveredStar: number | null;
  tooltipOpacity: number;
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

    // Interaction
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('touchstart', (e) => this.onTouch(e), { passive: true });
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

    // Animate star alphas toward target
    for (let i = 0; i < this.constellation.stars.length; i++) {
      const target = i < this.state.revealedCount ? 1 : 0;
      this.state.starAlphas[i] += (target - this.state.starAlphas[i]) * 0.04;
    }

    // Animate line alphas (appear after both connected stars are visible)
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

    // Draw tooltip for hovered star
    if (this.state.hoveredStar !== null) {
      this.state.tooltipOpacity = Math.min(1, this.state.tooltipOpacity + 0.06);
      this.drawTooltip(ctx, w, h);
    } else {
      this.state.tooltipOpacity = Math.max(0, this.state.tooltipOpacity - 0.08);
      if (this.state.tooltipOpacity > 0.01) {
        this.drawTooltip(ctx, w, h);
      }
    }
  }

  private drawTooltip(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.constellation || this.state.hoveredStar === null) return;
    const star = this.constellation.stars[this.state.hoveredStar];
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

    // Position above star, flip below if near top
    const yOffset = py < h * 0.25 ? 40 : -30;
    const textY = py + yOffset;
    const textX = Math.max(textWidth / 2 + 20, Math.min(px, w - textWidth / 2 - 20));

    // Background pill
    const padX = 20;
    const padY = 10;
    ctx.fillStyle = `rgba(10, 10, 26, ${alpha * 0.8})`;
    ctx.beginPath();
    const pillW = Math.min(textWidth + padX * 2, maxWidth + padX * 2);
    const pillH = 36;
    const pillX = textX - pillW / 2;
    const pillY = textY - pillH + padY / 2;
    ctx.roundRect(pillX, pillY, pillW, pillH, 18);
    ctx.fill();

    // Text
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--text-primary').trim();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.92})`;
    ctx.fillText(text, textX, textY, maxWidth);
    ctx.restore();
  }

  private onMouseMove(e: MouseEvent) {
    this.checkHover(e.clientX, e.clientY);
  }

  private onTouch(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.checkHover(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  private onClick(e: MouseEvent) {
    this.checkHover(e.clientX, e.clientY);
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
    // Handle hex colors
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Handle rgba
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }

  stop() {
    cancelAnimationFrame(this.animId);
    if (this.revealTimer) clearTimeout(this.revealTimer);
  }
}
```

**Step 2: Visual verification**

Will be tested visually when wired into the view page (Task 7). For now, verify the file compiles:

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: add constellation renderer with star glow, connections, and tooltip interaction"
```

---

### Task 6: Create Page UI

**Files:**
- Create: `src/views/create.ts`
- Modify: `src/style.css` (append create-page styles)
- Modify: `src/main.ts` (wire up create view)

**Step 1: Write the create page view**

Create `src/views/create.ts`:
```typescript
import { ConstellationData, splitSentences, buildShareURL } from '../data';
import { generateConstellation } from '../constellation';
import { ConstellationRenderer } from '../renderer';

const THEMES = [
  { id: 'gold', label: 'Warm Gold', class: '' },
  { id: 'rose', label: 'Rose Quartz', class: 'theme-rose' },
  { id: 'arctic', label: 'Arctic Blue', class: 'theme-arctic' },
  { id: 'aurora', label: 'Aurora', class: 'theme-aurora' },
] as const;

export function createView(app: HTMLElement) {
  app.innerHTML = `
    <div class="create-page">
      <div class="create-content">
        <h1 class="create-title">Write someone a constellation</h1>
        <p class="create-subtitle">Your words become stars. Each sentence, a point of light in their sky.</p>

        <form class="create-form" id="create-form">
          <div class="form-row">
            <div class="form-field">
              <label for="field-to">To</label>
              <input type="text" id="field-to" placeholder="Their name" maxlength="50" required />
            </div>
            <div class="form-field">
              <label for="field-from">From</label>
              <input type="text" id="field-from" placeholder="Your name" maxlength="50" required />
            </div>
          </div>

          <div class="form-field">
            <label for="field-message">Your message</label>
            <textarea id="field-message" placeholder="Write from the heart. Each sentence becomes a star..." rows="5" required></textarea>
            <div class="char-hint" id="star-count">0 stars</div>
          </div>

          <div class="form-field">
            <label>Color theme</label>
            <div class="theme-picker" id="theme-picker">
              ${THEMES.map(
                (t, i) => `
                <button type="button" class="theme-btn${i === 0 ? ' active' : ''}" data-theme="${t.id}" title="${t.label}">
                  <span class="theme-dot theme-dot-${t.id}"></span>
                  <span class="theme-label">${t.label}</span>
                </button>`
              ).join('')}
            </div>
          </div>

          <button type="submit" class="btn-create" id="btn-create">
            Create Constellation
          </button>
        </form>
      </div>

      <div class="create-preview" id="create-preview">
        <canvas id="preview-canvas"></canvas>
      </div>

      <!-- Share panel (hidden initially) -->
      <div class="share-panel hidden" id="share-panel">
        <div class="share-panel-inner">
          <h2>Your constellation is ready</h2>
          <p class="share-subtitle">Share this link and they'll see a sky written just for them.</p>
          <div class="share-link-box">
            <input type="text" id="share-url" readonly />
            <button type="button" class="btn-copy" id="btn-copy">Copy</button>
          </div>
          <div class="share-actions">
            <button type="button" class="btn-share" id="btn-share">Share</button>
            <button type="button" class="btn-preview" id="btn-preview">Preview</button>
          </div>
          <button type="button" class="btn-back" id="btn-back">Write another</button>
        </div>
      </div>
    </div>
  `;

  // State
  let selectedTheme: ConstellationData['theme'] = 'gold';
  let previewRenderer: ConstellationRenderer | null = null;

  const form = document.getElementById('create-form') as HTMLFormElement;
  const fieldTo = document.getElementById('field-to') as HTMLInputElement;
  const fieldFrom = document.getElementById('field-from') as HTMLInputElement;
  const fieldMessage = document.getElementById('field-message') as HTMLTextAreaElement;
  const starCount = document.getElementById('star-count')!;
  const themePicker = document.getElementById('theme-picker')!;
  const sharePanel = document.getElementById('share-panel')!;
  const shareUrl = document.getElementById('share-url') as HTMLInputElement;
  const btnCreate = document.getElementById('btn-create')!;
  const btnCopy = document.getElementById('btn-copy')!;
  const btnShare = document.getElementById('btn-share')!;
  const btnPreview = document.getElementById('btn-preview')!;
  const btnBack = document.getElementById('btn-back')!;
  const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

  // Live preview
  function updatePreview() {
    const text = fieldMessage.value.trim();
    const sentences = text ? splitSentences(text) : [];
    const count = sentences.length;
    starCount.textContent = `${count} star${count !== 1 ? 's' : ''}`;

    if (count > 0 && previewCanvas) {
      const constellation = generateConstellation(sentences, previewCanvas.offsetWidth, previewCanvas.offsetHeight);
      if (!previewRenderer) {
        previewRenderer = new ConstellationRenderer(previewCanvas);
        previewRenderer.startRenderLoop();
      }
      previewRenderer.setConstellation(constellation);
      // Reveal all immediately for preview
      for (let i = 0; i <= constellation.stars.length; i++) {
        setTimeout(() => {
          if (previewRenderer) {
            (previewRenderer as any).state.revealedCount = i;
          }
        }, i * 100);
      }
    }
  }

  fieldMessage.addEventListener('input', updatePreview);

  // Theme picker
  themePicker.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.theme-btn') as HTMLElement;
    if (!btn) return;
    themePicker.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.dataset.theme as ConstellationData['theme'];
    selectedTheme = theme;

    // Apply theme class to document
    document.documentElement.className = THEMES.find(t => t.id === theme)?.class || '';
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data: ConstellationData = {
      to: fieldTo.value.trim(),
      from: fieldFrom.value.trim(),
      message: fieldMessage.value.trim(),
      theme: selectedTheme,
    };

    const url = buildShareURL(data);
    shareUrl.value = url;
    sharePanel.classList.remove('hidden');
    btnCreate.classList.add('hidden');

    // Hide share button if Web Share API not available
    if (!navigator.share) {
      btnShare.classList.add('hidden');
    }
  });

  // Copy
  btnCopy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl.value);
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy'; }, 2000);
  });

  // Share (Web Share API)
  btnShare.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Someone wrote you a constellation',
        text: `${fieldFrom.value.trim()} wrote a constellation for ${fieldTo.value.trim()}`,
        url: shareUrl.value,
      });
    } catch {
      // User cancelled — that's fine
    }
  });

  // Preview
  btnPreview.addEventListener('click', () => {
    window.open(shareUrl.value, '_blank');
  });

  // Back
  btnBack.addEventListener('click', () => {
    sharePanel.classList.add('hidden');
    btnCreate.classList.remove('hidden');
  });
}
```

**Step 2: Add create-page styles to `src/style.css`**

Append to `src/style.css`:
```css
/* ============ CREATE PAGE ============ */
.create-page {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.create-content {
  flex: 0 0 480px;
  max-width: 480px;
  height: 100%;
  overflow-y: auto;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(135deg, rgba(10,10,26,0.95), rgba(15,15,46,0.9));
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255,255,255,0.04);
}

.create-title {
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: 2rem;
  line-height: 1.2;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.create-subtitle {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 16px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-field {
  flex: 1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.form-field input,
.form-field textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 300;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.form-field input::placeholder,
.form-field textarea::placeholder {
  color: var(--text-dim);
}

.form-field input:focus,
.form-field textarea:focus {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
}

.form-field textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.char-hint {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-align: right;
}

/* Theme picker */
.theme-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover {
  background: rgba(255,255,255,0.06);
}

.theme-btn.active {
  border-color: var(--accent);
  background: rgba(255,255,255,0.06);
  color: var(--text-primary);
}

.theme-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.theme-dot-gold { background: #ffd685; }
.theme-dot-rose { background: #f4a0b5; }
.theme-dot-arctic { background: #8ec8e8; }
.theme-dot-aurora { background: #8ee8b5; }

/* Create button */
.btn-create {
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--star-glow), var(--star-color));
  color: #0a0a1a;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  margin-top: 8px;
}

.btn-create:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-create.hidden {
  display: none;
}

/* Preview panel */
.create-preview {
  flex: 1;
  position: relative;
}

.create-preview canvas {
  width: 100%;
  height: 100%;
}

/* ============ SHARE PANEL ============ */
.share-panel {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 26, 0.85);
  backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.share-panel.hidden {
  display: none;
}

.share-panel-inner {
  max-width: 460px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.share-panel-inner h2 {
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: 1.8rem;
  color: var(--text-primary);
}

.share-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 300;
  line-height: 1.5;
}

.share-link-box {
  display: flex;
  width: 100%;
  gap: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}

.share-link-box input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255,255,255,0.04);
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  outline: none;
}

.btn-copy {
  padding: 12px 20px;
  background: rgba(255,255,255,0.08);
  border: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-copy:hover {
  background: rgba(255,255,255,0.12);
}

.share-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.btn-share,
.btn-preview {
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-share:hover,
.btn-preview:hover {
  background: rgba(255,255,255,0.08);
}

.btn-share.hidden {
  display: none;
}

.btn-back {
  margin-top: 8px;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--text-dim);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-back:hover {
  color: var(--text-secondary);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ============ RESPONSIVE ============ */
@media (max-width: 768px) {
  .create-page {
    flex-direction: column;
  }

  .create-content {
    flex: none;
    max-width: 100%;
    width: 100%;
    height: auto;
    padding: 32px 24px;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .create-preview {
    flex: 1;
    min-height: 300px;
  }

  .create-title {
    font-size: 1.6rem;
  }

  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
```

**Step 3: Wire create view into main.ts**

Update `src/main.ts`:
```typescript
import './style.css';
import { StarField } from './starfield';
import { createView } from './views/create';

function getRoute(): 'create' | 'view' {
  const params = new URLSearchParams(window.location.search);
  return params.has('d') ? 'view' : 'create';
}

function init() {
  const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  const starField = new StarField(bgCanvas);
  starField.start();

  const app = document.getElementById('app')!;
  const route = getRoute();

  if (route === 'create') {
    createView(app);
  } else {
    // View page — Task 7
    app.innerHTML = '<p style="padding:40px;color:white;">View page coming soon...</p>';
  }
}

init();
```

**Step 4: Visual verification**

```bash
npm run dev
```
Expected: Left panel with form fields, right side shows constellation preview. Typing a message updates star count. Theme buttons switch active states. Submitting form shows share panel overlay.

**Step 5: Commit**

```bash
git add src/views/create.ts src/style.css src/main.ts
git commit -m "feat: add create page with form, live preview, theme picker, and share panel"
```

---

### Task 7: View / Experience Page

**Files:**
- Create: `src/views/view.ts`
- Modify: `src/style.css` (append view-page styles)
- Modify: `src/main.ts` (wire up view route)

**Step 1: Write the view page**

Create `src/views/view.ts`:
```typescript
import { decode, splitSentences, ConstellationData } from '../data';
import { generateConstellation } from '../constellation';
import { ConstellationRenderer } from '../renderer';

const THEME_CLASS: Record<ConstellationData['theme'], string> = {
  gold: '',
  rose: 'theme-rose',
  arctic: 'theme-arctic',
  aurora: 'theme-aurora',
};

export function viewPage(app: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('d');

  if (!encoded) {
    showError(app);
    return;
  }

  const data = decode(encoded);
  if (!data) {
    showError(app);
    return;
  }

  // Apply theme
  document.documentElement.className = THEME_CLASS[data.theme] || '';

  const sentences = splitSentences(data.message);
  const constellation = generateConstellation(sentences, window.innerWidth, window.innerHeight);

  app.innerHTML = `
    <div class="view-page">
      <canvas id="constellation-canvas"></canvas>

      <div class="view-intro" id="view-intro">
        <p class="intro-from">${escapeHtml(data.from)} wrote you a constellation</p>
      </div>

      <div class="view-hint hidden" id="view-hint">
        <p>touch the stars to read the message</p>
      </div>

      <div class="view-footer hidden" id="view-footer">
        <p class="footer-valentine">Happy Valentine's Day</p>
        <p class="footer-names">To ${escapeHtml(data.to)}, with love from ${escapeHtml(data.from)}</p>
        <a href="${window.location.origin}${window.location.pathname}" class="footer-create">Write your own constellation</a>
      </div>
    </div>
  `;

  const canvas = document.getElementById('constellation-canvas') as HTMLCanvasElement;
  const intro = document.getElementById('view-intro')!;
  const hint = document.getElementById('view-hint')!;
  const footer = document.getElementById('view-footer')!;

  const renderer = new ConstellationRenderer(canvas);
  renderer.setConstellation(constellation, () => {
    // All stars revealed
    hint.classList.remove('hidden');
    hint.classList.add('fade-in');
    setTimeout(() => {
      footer.classList.remove('hidden');
      footer.classList.add('fade-in');
    }, 2000);
  });

  // Sequence: intro text → pause → start revealing stars
  setTimeout(() => {
    intro.classList.add('fade-out');
    setTimeout(() => {
      intro.classList.add('hidden');
      renderer.startRenderLoop();
      renderer.startRevealSequence(1000);
    }, 1000);
  }, 3000);
}

function showError(app: HTMLElement) {
  app.innerHTML = `
    <div class="view-error">
      <h1>This constellation couldn't be found</h1>
      <p>The link may be incomplete or expired.</p>
      <a href="${window.location.origin}${window.location.pathname}">Write a new constellation</a>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Step 2: Add view-page styles to `src/style.css`**

Append to `src/style.css`:
```css
/* ============ VIEW PAGE ============ */
.view-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.view-page canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.view-intro {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 1.5s ease;
}

.intro-from {
  font-family: var(--font-serif);
  font-weight: 300;
  font-style: italic;
  font-size: clamp(1.4rem, 4vw, 2.4rem);
  color: var(--text-primary);
  text-align: center;
  padding: 0 24px;
  letter-spacing: 0.01em;
}

.view-hint {
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  z-index: 2;
  text-align: center;
  pointer-events: none;
}

.view-hint p {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 0.85rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.view-footer {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  z-index: 2;
  text-align: center;
  pointer-events: none;
}

.footer-valentine {
  font-family: var(--font-serif);
  font-weight: 300;
  font-style: italic;
  font-size: 1.1rem;
  color: var(--accent);
  margin-bottom: 4px;
}

.footer-names {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.footer-create {
  pointer-events: all;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--text-dim);
  text-decoration: none;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 2px;
  transition: color 0.2s;
}

.footer-create:hover {
  color: var(--text-secondary);
}

/* View error */
.view-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 12px;
  padding: 24px;
}

.view-error h1 {
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: 1.6rem;
  color: var(--text-primary);
}

.view-error p {
  color: var(--text-secondary);
  font-weight: 300;
}

.view-error a {
  margin-top: 16px;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid;
  padding-bottom: 2px;
}

/* Animation utilities */
.fade-in {
  animation: fadeIn 1.5s ease;
}

.fade-out {
  animation: fadeOut 1s ease forwards;
}

.hidden {
  display: none !important;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

**Step 3: Wire view page into main.ts**

Update `src/main.ts`:
```typescript
import './style.css';
import { StarField } from './starfield';
import { createView } from './views/create';
import { viewPage } from './views/view';

function getRoute(): 'create' | 'view' {
  const params = new URLSearchParams(window.location.search);
  return params.has('d') ? 'view' : 'create';
}

function init() {
  const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  const starField = new StarField(bgCanvas);
  starField.start();

  const app = document.getElementById('app')!;
  const route = getRoute();

  if (route === 'create') {
    createView(app);
  } else {
    viewPage(app);
  }
}

init();
```

**Step 4: Visual verification**

```bash
npm run dev
```

1. Go to `localhost:5173` — should see create page
2. Fill out form, create constellation, copy the link
3. Open the link in a new tab — should see intro text fade in, then stars appear one by one, then hint and footer
4. Hover/tap stars to see sentences

**Step 5: Commit**

```bash
git add src/views/view.ts src/style.css src/main.ts
git commit -m "feat: add view page with intro sequence, star reveal animation, and interactive tooltips"
```

---

### Task 8: Polish & Final Touches

**Files:**
- Modify: `src/style.css` (scrollbar, selection, polish)
- Modify: `index.html` (favicon, OG tags)
- Modify: `src/views/create.ts` (form validation polish)

**Step 1: Add meta tags and favicon**

Update `index.html` `<head>`:
```html
<meta property="og:title" content="Someone wrote you a constellation" />
<meta property="og:description" content="A love message, written in stars." />
<meta property="og:type" content="website" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>">
```

**Step 2: Add final CSS polish**

Append to `src/style.css`:
```css
/* ============ GLOBAL POLISH ============ */
::selection {
  background: rgba(255, 214, 133, 0.2);
  color: var(--text-primary);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.15);
}

/* Smooth body transitions for theme changes */
html {
  transition: --star-color 0.4s, --star-glow 0.4s;
}
```

**Step 3: Build and verify**

```bash
npm run build
```
Expected: Clean build in `dist/` folder, no TypeScript errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add meta tags, favicon, and final CSS polish"
```

---

### Task 9: Smoke Test Full Flow

**Files:** None (verification only)

**Step 1: Run dev server and full user journey test**

```bash
npm run dev
```

Verify the complete flow:
1. Landing page loads with star field background
2. Fill in "To: Sarah", "From: Mark", message with 4-5 sentences
3. Star count updates live, preview shows constellation forming
4. Switch between all 4 color themes — each changes the palette
5. Click "Create Constellation" — share panel appears
6. Copy the link, open in new tab
7. Intro text "Mark wrote you a constellation" fades in
8. After 3 seconds, stars reveal one by one
9. Hover/tap each star — sentence tooltip appears
10. "Happy Valentine's Day" footer appears after all stars revealed
11. "Write your own constellation" link works
12. Test on mobile viewport (responsive layout)

**Step 2: Run tests**

```bash
npm test
```
Expected: All data and constellation tests pass.

**Step 3: Production build**

```bash
npm run build
```
Expected: Clean build.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full flow — all tests pass, production build clean"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|----------------|
| 1 | Project scaffolding (Vite + TS + styles + themes) | 6 |
| 2 | Data encoding/decoding with LZ-string + tests | 4 |
| 3 | Seeded PRNG + constellation algorithm + tests | 4 |
| 4 | Background star field canvas (particles, nebula, shooting stars) | 4 |
| 5 | Constellation renderer (stars, glow, lines, tooltips) | 3 |
| 6 | Create page UI (form, preview, theme picker, share panel) | 5 |
| 7 | View page (intro sequence, star reveal, interaction, footer) | 5 |
| 8 | Polish (meta tags, favicon, CSS refinements) | 4 |
| 9 | Smoke test full flow | 4 |
