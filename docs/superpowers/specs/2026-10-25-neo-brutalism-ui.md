# Neo Brutalism UI Reskin — Design Spec

**Date:** 2026-10-25
**Status:** Ready for human review
**Reference:** Supplied “Neo Brutalism UI Library” image (cream canvas, heavy ink outlines, offset shadows, rounded cards, pink/purple/teal/yellow accents).

## 1. Goal

Reskin every user-facing screen of Photo-US from pixel art to Neo Brutalism without changing camera capture, live filters, frame rendering, upload, retake, or export behavior.

The app must still feel like the same photo booth: the camera and the finished photo strip remain the visual focus. The new chrome should be bold, playful, and highly legible on a phone held at arm’s length.

## 2. Visual direction

- **Canvas:** warm cream, not white. The app should feel like printed paper, not a dashboard.
- **Ink:** near-black `#111111` for every border, icon, and primary text.
- **Outlines:** 3px solid ink on cards, inputs, chips, and buttons. 4px on the camera/preview frame.
- **Shadows:** hard offset shadows with no blur. `6px 6px 0 #111` for cards, `4px 4px 0 #111` for buttons, `3px 3px 0 #111` for small elements.
- **Corners:** generous but not pill-shaped. Cards `18px`, buttons/inputs `12–14px`, chips can be fully rounded.
- **Color:** vibrant accents used as large flat fills, never as gradients. Pink is the primary action color; purple, teal, yellow, blue, and red are supporting actions/status colors.
- **Typography:** heavy display sans for the brand and large numbers; geometric sans for body and controls; mono only for tiny technical metadata.
- **Motion:** short, physical press feedback (translate + shadow collapse). No bouncy or pixel-step animation.
- **Decoration:** occasional flat color blocks/shapes are allowed in empty states and the header. No pixel dots, no `image-rendering: pixelated`, no CRT/scanline effects.

## 3. Design tokens

| Token | Value | Use |
|---|---|---|
| `--nb-bg` | `#f4ecdf` | Page background |
| `--nb-surface` | `#fffdf7` | Cards, header, inputs |
| `--nb-ink` | `#111111` | Borders, text, shadows |
| `--nb-muted` | `#5f5a53` | Secondary text |
| `--nb-pink` | `#ff6b8a` | Primary action, active filter |
| `--nb-pink-deep` | `#ff4f77` | Primary hover/pressed |
| `--nb-purple` | `#9b6bff` | Frame-related actions |
| `--nb-teal` | `#55d6c2` | Upload/add/export success |
| `--nb-yellow` | `#ffe45e` | Surprise/help/highlight |
| `--nb-blue` | `#7cc8ff` | Secondary/info actions |
| `--nb-orange` | `#ffb35c` | Warnings |
| `--nb-red` | `#ff5a5f` | Retake/error |
| `--nb-radius` | `18px` | Cards |
| `--nb-radius-sm` | `12px` | Inputs, small cards |
| `--nb-border` | `3px solid var(--nb-ink)` | Standard border |
| `--nb-shadow` | `6px 6px 0 var(--nb-ink)` | Standard card shadow |
| `--nb-shadow-sm` | `3px 3px 0 var(--nb-ink)` | Small elements |

All bright accent fills use ink text (`#111111`) for contrast and the printed-poster look. White text is reserved for dark surfaces and video overlays. Never put white text on yellow, teal, pink, purple, or red.

## 4. Typography

- **Display:** `Archivo Black` — logo, screen titles, countdown numbers, empty-state headlines.
- **Body/UI:** `Space Grotesk` 400/500/600/700 — buttons, labels, descriptions, inputs.
- **Metadata:** `Space Mono` 400/700 — shot counters, debug values, footer, frame metadata.
- **Loading:** Google Fonts, `display=swap`.
- **Rules:** no `Silkscreen`, `Press Start 2P`, or `VT323` in the app chrome. Built-in frame canvas strings in `src/frames/frames.js` are out of scope because built-ins remain disabled.

## 5. Component language

### Cards
`.nb-card` = surface + 3px ink border + 18px radius + 6px hard shadow. A smaller `.nb-card-sm` uses 12px radius and 3px shadow. Camera/preview shells use a 4px border and 8px shadow.

### Buttons
- `.nb-btn` = 3px border, 12px radius, 4px shadow, uppercase 700 label, min-height 44px.
- Hover: lift 1px and increase shadow by 1px.
- Active: translate 3px/3px and remove shadow.
- Focus-visible: 3px ink outline with 3px offset; never remove the focus ring.
- Disabled: 45% opacity, no transform, 2px shadow, `cursor: not-allowed`.
- Variants: `.nb-btn-primary` (pink), `.nb-btn-purple`, `.nb-btn-teal`, `.nb-btn-yellow`, `.nb-btn-blue`, `.nb-btn-danger` (red), `.nb-btn-icon` (square), `.nb-btn-lg` (52px min-height). Every accent variant uses ink text; only buttons on a dark/ink surface use white text.

### Chips and segmented controls
- `.nb-chip` = paper fill, 2px ink border, pill radius, 2px shadow, min-height 44px for tappable chips.
- Selected chip: pink fill, ink text, pressed-in shadow.
- `.nb-segmented` = one bordered container; children are separated by 3px ink dividers. Selected segment is pink with ink text; disabled segment is 30% opacity.

### Inputs
`.nb-input` = white/paper fill, 3px ink border, 12px radius, 3px shadow, Space Grotesk 600. Focus adds a pink inner ring and keeps the outer hard shadow.

### Camera and preview
- `.nb-camera` = black interior, 4px ink border, 24px radius, 8px shadow, overflow hidden.
- HUD text stays white/mono for contrast over video.
- Idle/loading/error overlays use cream cards or a dark translucent panel with a clear primary action.
- `.nb-thumb` = 4:5 thumbnail, 2px ink border, 8px radius, 2px shadow; filled thumbnails reveal a retake icon on hover/press.

### Modals
- Overlay: `rgba(17,17,17,.55)` plus a light backdrop blur with a solid fallback.
- Card: `.nb-modal-card` centered, max-width 28rem, 3px border, 18px radius, 8px shadow, max-height `min(82vh, 44rem)`, scrollable body.
- Mobile: same card with 12px page padding; never full-bleed edge-to-edge.

### Debug/tune panels
- Keep them visually distinct from the product UI: black panel, lime/white mono text, 3px ink border, 12px radius, 4px shadow. Tune controls use paper rows with pink accent sliders.
- These panels remain dev-only and query-string gated.

## 6. Screen map

### Loading
Cream page, centered `.nb-card`, pink camera tile, “Memuat frame…” in Space Mono.

### App header
Paper card. Pink logo tile with camera icon, `PHOTO-US` in Archivo Black, pink heart, subtitle `NEO BRUTALIST PHOTOBOOTH • LIVE FILTERS & FRAMES` (desktop only). `ACAK` is yellow; help is blue icon button.

### Camera screen
1. Top row: frame badge/chip (pink/purple accent), sound icon button.
2. Shots-per-strip card: label + segmented control (1/2/3/4/6).
3. Camera card: aspect 3:4 mobile / 4:3 desktop, video/canvas, HUD, idle/loading/error overlays, countdown, capture banner, floating mirror/camera-switch controls.
4. Filter rail: heading + active filter chip; horizontally scrollable chip row with snap and visible edge affordance.
5. Captured-slot thumbnails.
6. Primary actions: `MULAI SESI FOTO`, `UPLOAD`.
7. Optional debug/tune panels.

### Studio screen
1. Header with back/retake danger icon, title, frame button (purple).
2. Preview card with black canvas interior; empty state.
3. Slot thumbnails + add-from-gallery action (teal).
4. Caption card with input and 0/30 counter.
5. Actions: `AMBIL ULANG` (pink/danger), `SIMPAN FOTO` (teal), `TAMBAH` (blue).
6. Frame info line + toast (`nb-toast`, ink background, white text, hard shadow).

### Frame picker
Modal with header, close icon button, 1-column mobile / 2-column desktop grid, custom frame cards. Selected card uses pink fill, 3px ink border, 3px shadow. Show thumbnail, name, layout, allowed shots, and `Bawaan` only when applicable. Add an empty state when no frames exist.

### Info modal
Paper modal; close icon button; each instruction row is a small cream card with a colored icon; primary “MENGERTI, AYO FOTO!” button full width.

## 7. Responsive behavior

- **320px:** no horizontal page scroll. Header action labels collapse to icons; filter rail scrolls horizontally; modal bodies scroll vertically; action buttons stack.
- **390px:** target iPhone viewport. All primary controls at least 44×44; camera card, filter rail, and primary action visible without horizontal clipping.
- **768px:** header shows subtitle; studio actions align in one row; frame picker becomes 2 columns.
- **1280px:** `.app-container` max-width 1040px, centered; camera screen remains max-width ~32rem; studio preview max-width ~48rem.
- Use `min-width: 0` on flex children that contain truncating text. Use `overflow-wrap: anywhere` for long frame names in modals.

## 8. Accessibility

- 3px visible `:focus-visible` ring on every interactive element.
- Icon-only buttons get `aria-label`.
- Filter buttons and frame cards expose `aria-pressed`.
- Modals use `role="dialog"`, `aria-modal="true"`, an accessible name, and Escape to close.
- Respect `prefers-reduced-motion`: disable heartBeat, blink, slide, and press transitions.
- Do not convey selected state by color alone: selected chips/cards also change border weight/shadow and expose `aria-pressed`.
- Keep text contrast at least WCAG AA for normal text; ink on cream/yellow/teal/pink meets this. White text is reserved for ink/black surfaces and video overlays.

## 9. Out of scope

- No changes to `src/camera/startCamera.js`, `src/filters/*`, `src/frames/frames.js`, `src/utils/canvasRenderer.js`, or export/capture algorithms.
- No re-enabling built-in frames; `ENABLE_BUILTIN_FRAMES = false` remains.
- No new runtime dependencies.
- No changes to frame PNG assets or `public/frames/index.json` contents.
- No new routes or features. This is a UI reskin, not a product redesign.

## 10. Acceptance criteria

1. App chrome contains no pixel fonts, no pixel-dot background, and no `image-rendering: pixelated`.
2. Every screen uses the cream/ink/hard-shadow/rounded-card language above.
3. Camera idle, permission error, countdown, active filter, and capture states are legible and actionable.
4. Frame picker, info modal, and studio caption/export states are usable at 320px and 390px.
5. No horizontal page scroll at 320, 390, 768, or 1280px.
6. `npm run build` passes.
7. Manual smoke test passes: start camera, switch filter, change shots, capture, select frame, upload, retake a slot, export, toast.
8. Backup exists before UI edits: `/home/bentar-raya/Documents/photo-us-backups/photo-us-pre-neobrutalism-2026-10-25-184716.tar.gz` (SHA256 `101ee82a3a806c4e6e92d5a1d527ef633070abc79b514a7418d1b4c40abf6534`).

## 11. Review focus

1. A 320px phone must not gain a horizontal scrollbar from the header, segmented control, filter rail, or studio actions.
2. Camera permission/error copy must remain readable and the retry/upload buttons tappable over a dark video surface.
3. Long frame names and the frame picker grid must not overflow or hide the close/select action on small screens.
4. Studio captions (30 characters), disabled export state, export progress, and toast must remain readable against the new palette.
5. Focus rings, reduced motion, and 44px tap targets must survive the reskin; visual boldness must not come at the cost of keyboard/touch access.
