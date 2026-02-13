# Written in Stars — Design Document

## Concept

A Valentine's Day digital experience where a sender writes a love message that transforms into a unique constellation in a night sky. Each sentence becomes a star. The recipient opens a link and watches their personal constellation form — then discovers the hidden words by interacting with each star.

**Core emotions:** Intimate & personal + Awe & wonder

## User Flow

### 1. Create (/)

The sender lands on a dark page with a subtle star field background. They provide:

- **To** — recipient's name
- **From** — sender's name
- **Message** — free-form text, auto-split into sentences (each becomes a star)
- **Color theme** — warm gold, rose quartz, arctic blue, or aurora

A live preview of the constellation forms as they type.

### 2. Share

After hitting "Create Constellation":

- Generated link (message compressed via LZ-string into URL)
- Copy link button
- Share button (Web Share API on mobile for WhatsApp, iMessage, etc.)
- Preview option to see what the recipient will experience

### 3. Experience (/view?d=...)

The recipient opens the link and sees:

1. Deep midnight sky with ambient particle effects
2. Intro text fades in: "[From] wrote you a constellation"
3. Stars appear one by one with a gentle pulse of light
4. Faint lines connect stars, forming the constellation
5. Hovering/tapping a star reveals the hidden sentence in elegant serif typography
6. Subtle "Happy Valentine's Day" with date at the bottom
7. Optional ambient sound toggle (muted by default)

## Visual Identity

- **Background:** Deep navy/midnight gradient with subtle nebula washes of purple and deep rose
- **Stars:** Warm gold/rose glow with soft bloom, gentle pulsing animation
- **Lines:** Hair-thin, semi-transparent, like a real star chart
- **Typography:** Elegant serif for messages (Playfair Display / Cormorant Garamond), clean sans-serif for UI
- **Mood:** Lying on a blanket looking up at the sky together

## Constellation Algorithm

- Sentences extracted from message
- Star positions generated via seeded PRNG based on message content (deterministic: same message = same constellation)
- Force-directed or spacing algorithm ensures stars are well-distributed
- Number of stars = number of sentences
- Lines connect stars in sequence
- Overall shape influenced by sentence count and word lengths

## Tech Stack

- **Vite** — build tool, fast dev server, clean production builds
- **HTML Canvas** — star field, constellation rendering, particle effects
- **Vanilla TypeScript** — no framework, keeps bundle tiny
- **LZ-string** — compress message data into URL-safe base64
- **CSS animations** — UI transitions, text reveals, share panel
- **Web Share API** — native mobile sharing
- **Google Fonts** — Playfair Display + Inter (or similar)

## Sharing Mechanism

- All data encoded in URL query parameter (`?d=...`)
- No backend, no database, fully static deployment
- LZ-string compression keeps URLs manageable for typical message lengths
- Data payload: `{ to, from, message, theme }`

## Deployment

Static site — deployable to Vercel, Netlify, GitHub Pages, or any static host.
