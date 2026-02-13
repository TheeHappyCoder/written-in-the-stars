# Written in the Stars

Turn love messages into interactive constellations. Each sentence becomes a star in a night sky that the recipient discovers one by one.

**[Live Demo](https://written-in-stars.vercel.app)**

![Written in the Stars — Create page with mobile preview](preview.png)

---

## How It Works

1. **Write sentences** — each one becomes a star
2. **Arrange your constellation** — drag stars into custom shapes or let the heart curve place them
3. **Pick a color theme** — Warm Gold, Rose Quartz, Arctic Blue, or Aurora
4. **Share the link** — no account needed, everything is encoded in the URL

The recipient opens the link and watches stars fade into existence. They tap the brightest star to reveal the first message, then follow the chain star by star until the full constellation is connected and the complete message is revealed.

## Features

**Create Page**
- Sentence-by-sentence input with live preview
- Drag & drop star positioning — form initials, shapes, anything
- Mobile preview toggle to see how it looks on a phone
- Four color themes with real-time switching
- First-time tour overlay explaining the experience
- Web Share API + clipboard copy for sharing

**View Page**
- Cinematic intro with sender's name
- Sequential star reveal with flash burst animations
- Guided reading — tap the pulsing beacon star to advance
- Connection lines draw between stars as you read
- Completion card with the full message
- "Write back" reply flow (pre-fills the sender's name)
- Date-aware: says "Happy Valentine's Day" on Feb 14

**Technical**
- Stars placed along a parametric heart curve with seeded randomness
- Custom positions encoded in the URL alongside the message
- LZ-string compression keeps URLs shareable
- Canvas rendering with glow effects, pulses, and flash bursts
- Fully static — no backend, no database, no cookies

## Tech Stack

| Layer | Choice |
|-------|--------|
| Build | Vite |
| Language | TypeScript (vanilla, no framework) |
| Rendering | HTML Canvas 2D |
| Compression | lz-string |
| Fonts | Cormorant Garamond + Inter (Google Fonts) |
| Testing | Vitest |
| Hosting | Vercel |

## Getting Started

```bash
# Clone
git clone https://github.com/TheeHappyCoder/written-in-the-stars.git
cd written-in-the-stars

# Install
npm install

# Dev server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

## Project Structure

```
src/
  main.ts              # Entry point, routing
  starfield.ts         # Background animated star field
  constellation.ts     # Heart curve algorithm, star placement
  renderer.ts          # Canvas renderer with drag, glow, flash effects
  data.ts              # Encode/decode constellation data for URL sharing
  style.css            # All styles, themes, responsive layout
  views/
    create.ts          # Create page — form, preview, drag, mobile toggle
    view.ts            # View page — reveal sequence, reading, completion
  data.test.ts         # Data encoding/decoding tests
  constellation.test.ts # Constellation generation tests
```

## Color Themes

| Theme | Preview |
|-------|---------|
| **Warm Gold** | Default — golden stars on deep navy |
| **Rose Quartz** | Soft pinks, romantic and warm |
| **Arctic Blue** | Cool blues, calm and serene |
| **Aurora** | Greens, like northern lights |

Themes are implemented as CSS custom properties and switch instantly across the entire experience.

## How Sharing Works

The entire message — names, sentences, theme, and optional star positions — is JSON-serialized, compressed with LZ-string, and encoded into the URL as a query parameter. No server involved.

```
https://written-in-stars.vercel.app/?d=N4IgLg...
                                       ^^^^^^^^
                                       compressed data
```

This means:
- Links never expire
- No rate limits or accounts
- Works offline once loaded
- Complete privacy — data only exists in the URL

## License

MIT
