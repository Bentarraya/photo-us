# Neo Brutalism UI Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Photo-US’s pixel-art chrome with a Neo Brutalist UI while preserving every camera, frame, filter, upload, retake, and export behavior.

**Architecture:** One stylesheet (`src/styles/neo-brutalism.css`) owns tokens, base styles, shared `.nb-*` primitives, and screen-specific classes. Existing `.pixel-*` class names stay as compatibility aliases so screens can migrate one at a time; no component logic changes. Each screen task edits its component and the screen-specific CSS that component uses.

**Tech Stack:** React 18, Vite 7, Tailwind CSS v4, Lucide icons, Google Fonts (Archivo Black, Space Grotesk, Space Mono). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-25-neo-brutalism-ui.md`

## Global Constraints

- Work on branch `feat/neo-brutalism-ui`; never edit `main` directly.
- Before editing, verify the backup exists: `/home/bentar-raya/Documents/photo-us-backups/photo-us-pre-neobrutalism-2026-10-25-184716.tar.gz`, SHA256 `101ee82a3a806c4e6e92d5a1d527ef633070abc79b514a7418d1b4c40abf6534`.
- Do not change `src/camera/startCamera.js`, `src/filters/*`, `src/frames/frames.js`, `src/utils/canvasRenderer.js`, frame geometry, capture, or export algorithms.
- Keep `ENABLE_BUILTIN_FRAMES = false`; built-in frames must remain disabled.
- No new runtime dependencies. Use existing Lucide icons and the three Google Fonts above.
- App chrome must not use `Silkscreen`, `Press Start 2P`, `VT323`, or `image-rendering: pixelated`. Built-in frame canvas strings in `src/frames/frames.js` are out of scope and may keep old font strings.
- Minimum interactive target: 44×44 CSS px. Keep a visible `:focus-visible` ring.
- Test viewports: 320×568, 390×844, 768×1024, 1280×900.
- Preserve all Indonesian copy except the header descriptor, which changes from `PIXEL PHOTOBOOTH` to `NEO BRUTALIST PHOTOBOOTH`.
- `npm run build` must pass after every task.
- This repo has no UI test runner. Verification is static `rg` assertions, a production build, headless screenshots for initial states, and manual interaction checks in a real browser. Do not add a test framework for a reskin.
- Useful dev commands:
  - `npm run dev -- --host 127.0.0.1` (HTTPS because `certs/` exists)
  - `google-chrome --headless=new --no-sandbox --ignore-certificate-errors --virtual-time-budget=3000 --window-size=390,844 --screenshot=/tmp/photo-us-390.png https://127.0.0.1:5173/`
  - In the browser console at each viewport: `document.documentElement.scrollWidth <= window.innerWidth` must be `true`.

## Review Focus

1. 320px width must not create horizontal page scroll from the header, segmented control, filter rail, or studio actions — pinned by Task 7 and the responsive checks in Tasks 3 and 5.
2. Camera permission/error copy must stay readable and the retry/upload actions tappable over a dark video surface — pinned by the error-state steps in Task 3 and Task 4.
3. Long frame names and the frame-picker grid must not overflow or hide the close/select action on small screens — pinned by Task 6.
4. Studio captions (30 characters), disabled export, export progress, and the toast must stay readable against the new palette — pinned by Task 5.
5. Focus rings, reduced motion, and 44px tap targets must survive the reskin — pinned by Task 7 and the accessibility edits in Tasks 2–6.

## File Structure

- `src/styles/neo-brutalism.css` — design tokens, base reset, shared `.nb-*` primitives, legacy `.pixel-*` aliases, animations, scrollbar.
- `src/styles/pixel.css` — delete after `neo-brutalism.css` is imported.
- `src/main.jsx` — import the new stylesheet.
- `index.html` — Google Fonts, title, theme color, favicon.
- `src/App.jsx` — page shell, header, footer, loading state, info modal.
- `src/components/CameraView.jsx` — camera top controls, live stage, overlays, filter rail, thumbnails, actions, debug/tune panels.
- `src/components/StudioView.jsx` — studio header, preview, slots, caption, actions, toast.
- `src/components/FramePicker.jsx` — frame picker modal and cards.
- `docs/superpowers/specs/2026-10-25-neo-brutalism-ui.md` — visual spec; read with this plan.

## Class Interface

The stylesheet exposes these shared classes. Later tasks consume them by name.

- Cards: `.nb-card`, `.nb-card-sm`
- Buttons: `.nb-btn`, `.nb-btn-primary`, `.nb-btn-purple`, `.nb-btn-teal`, `.nb-btn-yellow`, `.nb-btn-blue`, `.nb-btn-danger`, `.nb-btn-icon`, `.nb-btn-lg`
- Chips: `.nb-chip`, `.nb-chip.is-active`
- Segmented control: `.nb-segmented`, `.nb-segment`, `.nb-segment.is-active`
- Inputs/labels: `.nb-input`, `.nb-label`, `.nb-meta`, `.nb-pill`
- Empty states: `.nb-empty-state`
- Modals: `.nb-modal-overlay`, `.nb-modal-card`, `.nb-modal-header`
- Layout: `.app-container`

Legacy aliases that must remain until every old class is gone: `.pixel-box`, `.pixel-box-sm`, `.pixel-box-lg`, `.pixel-btn`, `.pixel-btn-primary`, `.pixel-btn-accent`, `.pixel-btn-cyan`, `.pixel-btn-purple`, `.pixel-btn-green`, `.pixel-btn-dark`, `.pixel-btn-icon`, `.pixel-btn-lg`, `.pixel-badge`, `.pixel-input`, `.pixel-overlay`, `.pixel-progress-container`, `.pixel-progress-bar`, `.pixel-progress-text`, `.countdown-badge`, `.flash-screen`, `.anim-heart`, `.anim-blink`, `.animate-slide-up`, `.mirror-x`.

---

### Task 1: Design Foundation and Global Chrome

**Files:**
- Create: `src/styles/neo-brutalism.css`
- Modify: `src/main.jsx`
- Modify: `index.html`
- Delete: `src/styles/pixel.css`
- Read: `docs/superpowers/specs/2026-10-25-neo-brutalism-ui.md`

**Interfaces:**
- Consumes: existing app entry point; no component props change.
- Produces: all shared classes in the “Class Interface” section; Tailwind theme tokens `font-display`, `font-sans`, `font-mono`, and colors `nb-bg`, `nb-surface`, `nb-ink`, `nb-muted`, `nb-pink`, `nb-pink-deep`, `nb-purple`, `nb-teal`, `nb-yellow`, `nb-blue`, `nb-orange`, `nb-red`.

- [ ] **Step 1: Verify the backup and create the branch**

```bash
cd /home/bentar-raya/Documents/photo-us
sha256sum -c /home/bentar-raya/Documents/photo-us-backups/photo-us-pre-neobrutalism-2026-10-25-184716.tar.gz.sha256
git status --short
git switch -c feat/neo-brutalism-ui
git add docs/superpowers/specs/2026-10-25-neo-brutalism-ui.md docs/superpowers/plans/2026-10-25-neo-brutalism-ui.md
git commit -m "docs: add neo brutalism design spec and plan"
```

Expected: checksum `OK`; `git status --short` prints only `?? docs/` (the spec/plan) or nothing if the docs are already committed; branch switches successfully; the docs commit succeeds. If the docs are already committed, skip the two docs commands.

- [ ] **Step 2: Prove the old theme is still active (failing check)**

```bash
rg -n "Silkscreen|Press Start 2P|VT323|image-rendering: pixelated" index.html src/styles src/App.jsx src/components/CameraView.jsx src/components/FramePicker.jsx
```

Expected before the change: matches in `index.html` and `src/styles/pixel.css`.

- [ ] **Step 3: Update `index.html` fonts, metadata, title, and favicon**

Replace the three pixel font families with:

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

Set `theme-color` to `#ff6b8a` and the title to `PHOTO-US 📸 Neo Brutalism Photobooth`. Replace the pixel favicon with a cream rounded square, 3px ink border, pink camera body, white lens, and yellow flash block. Keep the viewport meta unchanged.

- [ ] **Step 4: Write `src/styles/neo-brutalism.css`**

Start with `@import "tailwindcss";`, then add an `@theme` block with the fonts and `--color-nb-*` tokens from the spec, and a `:root` mirror for raw CSS. Use these exact values:

```css
--nb-bg: #f4ecdf;
--nb-surface: #fffdf7;
--nb-ink: #111111;
--nb-muted: #5f5a53;
--nb-pink: #ff6b8a;
--nb-pink-deep: #ff4f77;
--nb-purple: #9b6bff;
--nb-teal: #55d6c2;
--nb-yellow: #ffe45e;
--nb-blue: #7cc8ff;
--nb-orange: #ffb35c;
--nb-red: #ff5a5f;
--nb-radius: 18px;
--nb-radius-sm: 12px;
--nb-border: 3px solid var(--nb-ink);
--nb-shadow: 6px 6px 0 var(--nb-ink);
--nb-shadow-sm: 3px 3px 0 var(--nb-ink);
```

Body: cream `--nb-bg`, `Space Grotesk`, ink text, no background dots, no `image-rendering`. Do not add a global `* { margin: 0; padding: 0; }`; Tailwind preflight already handles it. Keep `box-sizing: border-box` and `-webkit-tap-highlight-color: transparent`. Do not set `overflow-x: hidden` on `html` or `body`; fix the offending element instead.

Implement the shared primitives and legacy aliases from the “Class Interface” section. Required behavior:
- `.nb-card` = surface, 3px border, 18px radius, 6px shadow.
- `.nb-card-sm` = surface, 3px border, 12px radius, 3px shadow.
- `.nb-btn` = 3px border, 12px radius, 4px shadow, 44px min-height, uppercase 700, inline-flex centered. Hover lifts 1px and grows shadow to 5px; active translates 3px/3px and removes shadow. Disabled sets opacity `.45`, `cursor: not-allowed`, 2px shadow.
- `.nb-btn-icon` = 44×44 square, zero horizontal padding. `.nb-btn-lg` = 52px min-height.
- `.nb-btn-primary` = pink with ink text; `.nb-btn-purple` = purple with ink text; `.nb-btn-teal` = teal with ink text; `.nb-btn-yellow` = yellow with ink text; `.nb-btn-blue` = blue with ink text; `.nb-btn-danger` = red with ink text.
- `.nb-chip` = paper, 2px border, pill radius, 2px shadow, 44px min-height for tappable chips, Space Grotesk 700 12px; `.nb-chip.is-active` = pink, ink text, pressed-in shadow.
- `.nb-segmented` = inline-flex, 3px border, 12px radius, overflow hidden, 3px shadow; `.nb-segment` = 44px min, 3px right border, paper; `.is-active` = pink/ink with a pressed-in shadow; disabled `.is-disabled` = 30% opacity.
- `.nb-input` = paper, 3px border, 12px radius, 3px shadow, 600 weight; focus adds a pink `0 0 0 3px` ring.
- Focus-visible: 3px ink outline with 3px offset on `.nb-btn`, `.nb-chip`, `.nb-segment`, `.nb-input`, and `.nb-frame-card`. Never remove the outline without a replacement.
- `.nb-empty-state` = centered flex column, 24px padding, transparent background supplied by its parent, 52px pink icon tile, display headline, inherited body color. Use `white/70` for body copy on dark camera/preview surfaces and `--nb-muted` on paper surfaces.
- `.nb-modal-overlay` = fixed inset 0, `rgba(17,17,17,.55)`, blur fallback. `.nb-modal-card` = paper, 3px border, 18px radius, 8px shadow, max-width 28rem, `max-height: min(82vh, 44rem)`, flex column.
- `.nb-label` = 700, uppercase, 0.06em tracking, 11px. `.nb-meta` = Space Mono, 11px, muted. `.nb-pill` = paper, 2px border, pill radius, 2px shadow, mono 11px.
- `.app-container` = max-width 1040px, centered, 12px padding, min-height 100vh, flex column; 24px padding at `min-width: 768px`.
- Scrollbar: cream track, pink thumb with 3px ink border.
- Animations: keep `.anim-heart`, `.anim-blink`, `.flash-screen`, `.animate-slide-up`, but use Neo timing/colors. Add `@media (prefers-reduced-motion: reduce)` to set animation and transition duration to `0.01ms` for these classes.
- Aliases: map every legacy class to the equivalent Neo rule; do not leave any pixel font, square icon button, or pixel-dot style in the aliases.
- `.countdown-badge` = Archivo Black, `clamp(56px, 14vw, 80px)`, yellow, `4px 4px 0` ink shadow, no pixel shadow colors.
- `.mirror-x` = `transform: scaleX(-1)`.

- [ ] **Step 5: Import the new stylesheet and delete the old one**

```jsx
// src/main.jsx
import './styles/neo-brutalism.css';
```

```bash
git rm src/styles/pixel.css
test ! -f src/styles/pixel.css
```

- [ ] **Step 6: Run the static check (must pass now)**

```bash
rg -n "Silkscreen|Press Start 2P|VT323|image-rendering: pixelated" index.html src/styles src/App.jsx src/components/CameraView.jsx src/components/FramePicker.jsx
```

Expected: no matches. `src/components/StudioView.jsx` is excluded until Task 5 because it still has an inline Silkscreen font; do not leave that inline font after Task 5.

- [ ] **Step 7: Build and capture a foundation screenshot**

```bash
npm run build
npm run dev -- --host 127.0.0.1
```

In a second terminal:

```bash
google-chrome --headless=new --no-sandbox --ignore-certificate-errors --virtual-time-budget=3000 --window-size=390,844 --screenshot=/tmp/photo-us-foundation-390.png https://127.0.0.1:5173/
```

Expected: build succeeds; screenshot shows cream page, ink-outlined cards/buttons, hard shadows, and no pixel dots. Layout may still be the old arrangement because the screen tasks are not done yet.

- [ ] **Step 8: Commit**

```bash
git add index.html src/main.jsx src/styles/neo-brutalism.css
git commit -m "feat: add neo brutalism design foundation"
```

---

### Task 2: App Shell, Header, Footer, and Info Modal

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles/neo-brutalism.css` (add `.nb-header`, `.nb-logo`, `.nb-footer`, `.nb-info-step`, `.nb-modal-body`)

**Interfaces:**
- Consumes: `.nb-card`, `.nb-btn`, `.nb-btn-yellow`, `.nb-btn-blue`, `.nb-btn-icon`, `.nb-modal-overlay`, `.nb-modal-card`, `.nb-label`, `.nb-meta`, `.nb-info-step`.
- Produces: `.nb-header`, `.nb-logo`, `.nb-footer`, `.nb-modal-body`, `.nb-info-step`; a shell that later screens render inside; no prop or state changes.

- [ ] **Step 1: Capture the current shell and note the failing visual check**

Start the dev server and capture `/tmp/photo-us-app-before-390.png` at 390×844. Expected: old pixel header/footer still visible; header subtitle contains `PIXEL PHOTOBOOTH`.

- [ ] **Step 2: Reskin the loading state**

Replace the white loading page with the cream page and a centered `.nb-card` (`max-w-sm`). Use a pink rounded icon tile, `Archivo Black` for “PHOTO-US”, and `Memuat frame...` in `.nb-meta`. Keep the frame-loading condition unchanged.

- [ ] **Step 3: Reskin `App.jsx` header and footer**

- Header: `header className="nb-header nb-card ..."`; logo tile `.nb-logo` as a `<button type="button" aria-label="Kembali ke kamera" onClick={handleRetake}>` with `bg-nb-pink`, ink camera icon, 3px ink border, 14px radius, hard shadow; title `font-display text-base sm:text-xl tracking-tight`; heart stays pink with `.anim-heart`.
- Subtitle: change `PIXEL PHOTOBOOTH • WYSIWYG LIVE FILTERS & FRAMES` to `NEO BRUTALIST PHOTOBOOTH • LIVE FILTERS & FRAMES`; keep it `hidden sm:block`; use `.nb-meta`.
- `ACAK`: `nb-btn nb-btn-yellow` with `min-h-[44px]`; keep the `hidden sm:inline` label.
- Help: `nb-btn nb-btn-blue nb-btn-icon` with `aria-label="Panduan"`.
- Header must wrap at 320px without horizontal scroll; add `flex-wrap gap-3 min-w-0` and allow the title block to `min-w-0`.
- Footer: keep the exact text `[PHOTO-US v2.0]`; use `.nb-footer` with `font-mono`, muted text, a pink heart, and `{allFrames.length} FRAMES & {FILTERS_REGISTRY.length} FILTERS`. Keep the `MADE WITH` line.
- Rename comments `Retro Pixel Header` and `Retro Pixel Footer` to `Header` and `Footer`.

- [ ] **Step 4: Reskin the info modal**

- Overlay: `.nb-modal-overlay`; card: `.nb-modal-card`; add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="info-modal-title"`.
- Header: `.nb-modal-header`; give the title `id="info-modal-title"`; keep the Sparkles icon but color it yellow/ink. Close button: `.nb-btn nb-btn-icon nb-btn-blue` with `aria-label="Tutup panduan"`, min 44×44.
- Body: `.nb-modal-body` with `overflow-y-auto`; each instruction becomes `.nb-info-step` (cream, 2px ink border, 12px radius, 12px padding) with the emoji/icon and bold lead-in. Use `font-sans text-sm leading-relaxed`, not mono.
- Primary button: `.nb-btn nb-btn-primary nb-btn-lg w-full`; keep the copy `MENGERTI, AYO FOTO!`.
- Add a `useEffect` keydown listener while `showInfoModal` is true that closes the modal on `Escape` and cleans up on unmount. Keep the close button as the primary accessible close.

- [ ] **Step 5: Verify**

```bash
rg -n "PIXEL PHOTOBOOTH|Retro Pixel" src/App.jsx
npm run build
```

Expected: no matches; build succeeds. Manually open at 320px and 390px, open the info modal, verify no horizontal scroll, the close button is 44×44, the modal body scrolls if needed, and Escape closes it. Capture `/tmp/photo-us-app-after-390.png`.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/styles/neo-brutalism.css
git commit -m "feat: reskin app shell and info modal"
```

---

### Task 3: Camera Top Controls and Live Stage

**Files:**
- Modify: `src/components/CameraView.jsx` (top bar, shots selector, camera stage, overlays, filter rail, captured thumbnails; current lines ~539–815)
- Modify: `src/styles/neo-brutalism.css` (add `.nb-camera`, `.nb-camera-hud`, `.nb-camera-state`, `.nb-alert`, `.nb-code-card`, `.nb-camera-banner`, `.nb-filter-rail`, `.nb-thumb`, `.nb-chip--frame`)

**Interfaces:**
- Consumes: all shared primitives from Task 1, including `.nb-empty-state`; existing `FramePicker`, camera refs, capture handlers.
- Produces: `.nb-camera`, `.nb-camera-hud`, `.nb-camera-state`, `.nb-alert`, `.nb-code-card`, `.nb-camera-banner`, `.nb-filter-rail`, `.nb-thumb`, `.nb-thumb.is-active`, `.is-filled`, `.is-empty`, `.nb-chip--frame`.

- [ ] **Step 1: Capture the current camera idle state**

At 390×844, screenshot `/tmp/photo-us-camera-before-390.png`. Expected: pixel font, pink dotted background, square buttons, no Neo camera shell.

- [ ] **Step 2: Reskin the top bar and shots selector**

- Frame trigger: replace `.pixel-badge` with a `<button type="button" className="nb-chip nb-chip--frame">`; it shows `FRAME: {currentFrame?.name || layout.name}` and opens the picker on click and keyboard.
- Sound button: `.nb-btn nb-btn-icon nb-btn-blue`; add `aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}`.
- Shots row: wrap in `.nb-card nb-card-sm`; label `.nb-label`; control `.nb-segmented`; each button `.nb-segment`; selected `.is-active`; disabled `.is-disabled`. Keep `aria-pressed`, `disabled`, and the existing titles. Remove raw `border-2`, `shadow-[2px_2px_0px_#000]`, `bg-pink-*`, and `text-white` classes from the selected segment.
- Ensure the row wraps at 320px without horizontal scroll.

- [ ] **Step 3: Reskin the camera card and states**

- Camera shell: replace `.pixel-box-lg` with `.nb-camera`; keep `aspect-[3/4] sm:aspect-[4/3]`, black background, overflow hidden.
- Idle: `.nb-camera-state .nb-empty-state`; pink icon tile; `font-display` headline; body copy `.font-sans`; start button `.nb-btn nb-btn-primary nb-btn-lg`.
- Loading: `.nb-camera-state` with dark translucent surface; `.countdown-badge` for the hourglass; use `font-mono text-sm text-white/70` for the permission message.
- Error: `.nb-camera-state`; wrap the error message in `.nb-alert` (red-tinted paper, 2px ink border, 12px radius); warning icon yellow; error title ink; error-detail instructions inside `.nb-code-card` (cream with ink text, 2px border, 12px radius, mono 11px); retry `.nb-btn nb-btn-primary`; upload `.nb-btn nb-btn-teal`. Keep `overflow-y-auto` and the existing platform-specific copy.
- HUD: `.nb-camera-hud` (inset 8px, 2px white/30 border, flex column, pointer-events none); keep REC/FILTER and FOCUS/BATTERY text in white/70 mono.
- Countdown: keep `.countdown-badge`; pose label `.nb-pill` on a dark panel; make sure it stays readable over any video.
- Capture banner: `.nb-camera-banner` (pink with ink text, 2px ink border, 3px shadow, centered, uppercase).
- Floating controls: camera switch `.nb-btn nb-btn-icon` with `aria-label="Ganti kamera depan atau belakang"`; mirror uses `.nb-btn nb-btn-primary` when on and `.nb-btn` when off. Keep 44px targets and `disabled={isCapturing}`.

- [ ] **Step 4: Reskin the filter rail and captured thumbnails**

- Filter header: `.nb-label`; selected filter value `.nb-pill`; no raw pink-50/pink-200 classes.
- Rail: `.nb-filter-rail` (horizontal scroll, scroll snap, 12px gap, padding-bottom for scrollbar). Keep `overflow-x-auto`; do not make the page scroll horizontally.
- Filter buttons: `.nb-chip`; selected `.is-active`; add `aria-pressed={selectedFilterId === filt.id}`; keep emoji, name, and 46px min-height.
- Captured slots: `.nb-thumb` with `w-16 h-20` (4:5), 2px ink border, 8px radius, 2px shadow; `is-filled` when an image exists, `is-empty` otherwise; active capture slot `is-active` with a pink ring/pulse. Keep the hover retake overlay and `RotateCcw` icon. Keep each slot as the existing `<div onClick>` and add `role="button"`, `tabIndex={0}`, `aria-label`, and an `onKeyDown` handler for Enter/Space.
- Keep the `title` text for retake slots.

- [ ] **Step 5: Add screen-specific CSS**

Add the listed camera/filter/thumbnail classes to `src/styles/neo-brutalism.css`. The camera shell must use a 4px ink border, 24px radius, 8px shadow, black interior. `.nb-alert` uses a red-tinted paper fill, 2px ink border, 12px radius, and ink text. The HUD must never capture pointer events. `.nb-filter-rail` must use `scrollbar-width: thin` and `scroll-snap-type: x proximity`; chips use `scroll-snap-align: start`. `.nb-chip--frame` uses the purple fill and ink text.

- [ ] **Step 6: Verify**

```bash
rg -n "pixel-box-lg|pixel-badge" src/components/CameraView.jsx
npm run build
```

Expected: no `pixel-box-lg` or `pixel-badge` matches; build succeeds. At 320px and 390px, verify the frame chip, shots selector, camera idle card, and filter rail are usable; the filter rail scrolls internally; `document.documentElement.scrollWidth <= window.innerWidth` is `true`. Capture `/tmp/photo-us-camera-after-390.png` and `/tmp/photo-us-camera-after-1280.png`.

- [ ] **Step 7: Commit**

```bash
git add src/components/CameraView.jsx src/styles/neo-brutalism.css
git commit -m "feat: reskin camera stage and filter controls"
```

---

### Task 4: Camera Actions, Captured-State Actions, Debug, and Tune Panels

**Files:**
- Modify: `src/components/CameraView.jsx` (action controls and panels; current lines ~817–1097)
- Modify: `src/styles/neo-brutalism.css` (add `.nb-actions`, `.nb-debug-panel`, `.nb-debug-line`, `.nb-tune-panel`, `.nb-tune-row`, `.nb-range`, `.nb-select`)

**Interfaces:**
- Consumes: `.nb-btn`, `.nb-btn-primary`, `.nb-btn-teal`, `.nb-card-sm`, `.nb-input`, `.nb-label`.
- Produces: `.nb-actions`, `.nb-debug-panel`, `.nb-debug-line`, `.nb-tune-panel`, `.nb-tune-row`, `.nb-range`, `.nb-select`; no handler changes.

- [ ] **Step 1: Reproduce the current action/debug state**

Open `https://127.0.0.1:5173/?debug=1&tune=1`; capture `/tmp/photo-us-debug-before-390.png`. Expected: old square pixel buttons, black/green debug block, dark tune panel with raw zinc classes.

- [ ] **Step 2: Reskin the action controls**

- Wrap the action buttons in `.nb-actions` (flex column on mobile, row from `sm`, 12px gap, top margin 32px, bottom margin 24px).
- Primary session button: `.nb-btn nb-btn-primary nb-btn-lg flex-1 min-h-[52px]`; keep the existing label/progress text and disabled logic.
- Upload button: `.nb-btn nb-btn-teal nb-btn-lg min-h-[52px]`; keep the hidden file input unchanged.
- Keep `disabled={isCapturing || cameraState !== 'active'}` and the upload disabled state.

- [ ] **Step 3: Reskin the debug panel**

- Container: `.nb-debug-panel` (black, lime text, 3px ink border, 12px radius, 4px shadow, mono 10px, overflow-x auto).
- Title: keep `[DEBUG PANEL (?debug=1)]` but use bold white. Each row `.nb-debug-line` with `overflow-wrap: anywhere` for the URL/user agent. Keep all existing debug values and error line; do not remove diagnostics.

- [ ] **Step 4: Reskin the tune panel**

- Container: `.nb-tune-panel` (paper, 3px border, 12px radius, 4px shadow, mono 11px).
- Header: title and a `.nb-btn nb-btn-icon nb-btn-blue` close button with `aria-label="Tutup tune panel"`.
- Grid: keep `grid-cols-1 sm:grid-cols-2`; each label `.nb-tune-row` (paper, 2px border, 8px radius, 8px padding). Label text uses ink 700; value uses `.nb-meta`.
- Select: `.nb-select` (paper, 2px border, 8px radius, mono 11px).
- Range inputs: `.nb-range` with `accent-color: var(--nb-pink)`; keep min/max/step and onChange behavior exactly.
- Buttons: `.nb-btn nb-btn-primary` for `LOG PARAMS`; `.nb-btn nb-btn-yellow` for `RESET`. Keep the existing handlers and console logging.

- [ ] **Step 5: Add screen-specific CSS**

Add `.nb-actions`, `.nb-debug-panel`, `.nb-debug-line`, `.nb-tune-panel`, `.nb-tune-row`, `.nb-range`, `.nb-select` to `src/styles/neo-brutalism.css`. Debug/tune panels are intentionally dark/technical; use ink/lime and pink accents, not cream cards.

- [ ] **Step 6: Verify**

```bash
rg -n "pixel-btn|pixel-box|pixel-badge" src/components/CameraView.jsx
npm run build
```

Expected: no `pixel-*` matches in `CameraView.jsx`; build succeeds. At 390px and 768px with `?debug=1&tune=1`, verify the debug rows wrap instead of forcing page scroll, sliders are usable by touch/keyboard, and the close button is 44×44. Capture `/tmp/photo-us-debug-after-390.png`.

- [ ] **Step 7: Commit**

```bash
git add src/components/CameraView.jsx src/styles/neo-brutalism.css
git commit -m "feat: reskin camera actions and diagnostics"
```

---

### Task 5: Studio Screen

**Files:**
- Modify: `src/components/StudioView.jsx`
- Modify: `src/styles/neo-brutalism.css` (add `.nb-preview`, `.nb-preview-canvas`, `.nb-caption-input`, `.nb-toast`, `.nb-studio-actions`)

**Interfaces:**
- Consumes: `.nb-card`, `.nb-btn-*`, `.nb-thumb`, `.nb-input`, `.nb-modal-*`; existing StudioView props.
- Produces: `.nb-preview`, `.nb-preview-canvas`, `.nb-caption-input`, `.nb-toast`, `.nb-studio-actions`; no export/caption behavior changes.

- [ ] **Step 1: Capture the current studio screen**

Use the app’s normal flow (or upload photos) to reach the studio; capture `/tmp/photo-us-studio-before-390.png`. Expected: pixel header/buttons, Silkscreen caption input, square slot borders.

- [ ] **Step 2: Reskin the studio header and preview**

- Header: `header className="nb-header nb-card ..."`; back/retake button `.nb-btn nb-btn-danger nb-btn-icon min-h-[44px] min-w-[44px]` with `aria-label="Ambil ulang semua"` and ink icon.
- Title: `font-display`; keep `PHOTO-US` and the heart; subtitle `.nb-meta` `EDIT & SIMPAN HASIL` hidden on mobile.
- Frame button: `.nb-btn nb-btn-purple` with `Sparkles`, `FRAME` label, 44px min-height.
- Preview wrapper: `.nb-preview` (paper card, 3px border, 18px radius, 6px shadow, `p-2 sm:p-3`). Canvas interior: `.nb-preview-canvas` (black, 2px ink border, 12px radius, overflow hidden); keep the existing aspect ratio calculation and canvas rendering.
- Empty state: `.nb-empty-state` with a pink icon tile and `Tidak ada foto` in `.nb-meta text-white/70`.

- [ ] **Step 3: Reskin slots, caption, and actions**

- Slots: `.nb-thumb` with `is-filled`/`is-empty`; use `w-16 h-20` (4:5); keep click-to-retake and hover `RotateCcw`. Keep the existing `<div onClick>`, add `role="button"`, `tabIndex={0}`, `aria-label`, and an `onKeyDown` handler for Enter/Space. Do not change slot click behavior.
- Add-from-gallery: `.nb-btn nb-btn-teal` with `ImageIcon`, 44px min-height; keep the file input and handler.
- Caption card: `.nb-card`; header icon pink; label `.nb-label`; input `.nb-input nb-caption-input` (large, centered, 600 weight) with no inline `fontFamily`; keep `maxLength={30}`, `slice(0, 30)`, placeholder, and counter.
- Actions: `.nb-studio-actions` flex column on mobile / row from `sm`; retake `.nb-btn nb-btn-primary nb-btn-lg`, export `.nb-btn nb-btn-teal nb-btn-lg`, add `.nb-btn nb-btn-blue nb-btn-lg`. Keep disabled logic and progress text exactly. The export button remains disabled when `!photos.length`.
- Frame info: `.nb-meta` with `Frame: ... • ... foto • ...`.
- Toast: `.nb-toast` fixed bottom center, ink background, white text, 3px border, 14px radius, 5px shadow; keep `.animate-slide-up` and the 3-second auto-dismiss.

- [ ] **Step 4: Add screen-specific CSS**

Add `.nb-preview`, `.nb-preview-canvas`, `.nb-caption-input`, `.nb-toast`, `.nb-studio-actions` to `src/styles/neo-brutalism.css`. `.nb-toast` must be readable over the cream page and must not block the action row. `.nb-caption-input` uses Space Grotesk 700, 18px, centered.

- [ ] **Step 5: Verify**

```bash
rg -n "Silkscreen|pixel-box|pixel-btn" src/components/StudioView.jsx
npm run build
```

Expected: no matches; build succeeds. At 390px and 1280px: verify the preview is centered, slots wrap, caption input accepts 30 characters, the counter updates, disabled export is visibly disabled, and the toast is readable. Capture `/tmp/photo-us-studio-after-390.png` and `/tmp/photo-us-studio-after-1280.png`.

- [ ] **Step 6: Commit**

```bash
git add src/components/StudioView.jsx src/styles/neo-brutalism.css
git commit -m "feat: reskin studio screen"
```

---

### Task 6: Frame Picker Modal

**Files:**
- Modify: `src/components/FramePicker.jsx`
- Modify: `src/styles/neo-brutalism.css` (add `.nb-frame-card`, `.nb-frame-thumb`, `.nb-frame-empty`)

**Interfaces:**
- Consumes: `.nb-modal-overlay`, `.nb-modal-card`, `.nb-modal-header`, `.nb-btn`, `.nb-btn-icon`, `.nb-label`, `.nb-meta`.
- Produces: `.nb-frame-card`, `.nb-frame-card.is-selected`, `.nb-frame-thumb`, `.nb-frame-empty`; existing `visible`, `onClose`, `onSelect`, `selectedFrameId`, `frames` props unchanged.

- [ ] **Step 1: Capture the current picker**

Open the frame picker from the camera screen at 390×844; capture `/tmp/photo-us-picker-before-390.png`. Expected: old square modal with pink-100 selection and tiny thumbnails.

- [ ] **Step 2: Reskin the modal shell and add accessibility**

- Overlay `.nb-modal-overlay`; card `.nb-modal-card`; add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="frame-picker-title"`.
- Header `.nb-modal-header`; title `id="frame-picker-title"` with Sparkles; close `.nb-btn nb-btn-icon nb-btn-blue` with `aria-label="Tutup pemilih frame"`, 44×44.
- Keep `.nb-modal-card` as a flex column; header and footer `shrink-0`; the grid is `min-h-0 overflow-y-auto`, so the footer close button stays visible on 320px-height screens.
- Keep Escape handling; close button remains the primary accessible close.

- [ ] **Step 3: Reskin the frame grid and cards**

- Grid: 1 column mobile, 2 columns from `sm`; 12px gap; `max-h-[min(52vh,28rem)]`; `overflow-y-auto`; `overscroll-contain`.
- Card: `.nb-frame-card` = paper, 3px border, 12px radius, 3px shadow, 44px min-height, left-aligned flex. Selected `.is-selected` = pink fill; add `aria-pressed={selectedFrameId === fr.id}`.
- Thumbnail: `.nb-frame-thumb` = 48×60, paper, 2px ink border, 8px radius, overflow hidden; keep image `object-cover`, lazy loading, and onError fallback.
- Text: name `font-sans font-bold text-sm truncate`; metadata `.nb-meta` with layout, allowed shots, and `• Bawaan` only when `fr.builtin`. Long names must not push the card wider than the grid.
- Empty state: if `frames.length === 0`, show `.nb-frame-empty` with a camera/sparkles icon and `Belum ada frame custom. Tambahkan PNG ke public/frames/.` Do not change how frames are loaded.
- Footer close button: `.nb-btn nb-btn-primary nb-btn-lg w-full` with `TUTUP`.

- [ ] **Step 4: Add screen-specific CSS**

Add `.nb-frame-card`, `.nb-frame-card.is-selected`, `.nb-frame-thumb`, `.nb-frame-empty` to `src/styles/neo-brutalism.css`. Selected cards must change border/shadow as well as color so selection is not color-only.

- [ ] **Step 5: Verify**

```bash
rg -n "pixel-box|pixel-btn|bg-pink-100|border-zinc" src/components/FramePicker.jsx
npm run build
```

Expected: no matches; build succeeds. Open the picker at 320×568 and 390×844: verify it fits, the body scrolls with many frames, long names truncate, Escape closes, and the selected card exposes `aria-pressed`. Capture `/tmp/photo-us-picker-after-390.png`.

- [ ] **Step 6: Commit**

```bash
git add src/components/FramePicker.jsx src/styles/neo-brutalism.css
git commit -m "feat: reskin frame picker"
```

---

### Task 7: Responsive, Accessibility, Cleanup, and Final Verification

**Files:**
- Modify: `src/App.jsx`, `src/components/CameraView.jsx`, `src/components/StudioView.jsx`, `src/components/FramePicker.jsx`, `src/styles/neo-brutalism.css` (only fixes discovered by the checks)
- Read: `docs/superpowers/specs/2026-10-25-neo-brutalism-ui.md`

**Interfaces:**
- Consumes: every class and screen from Tasks 1–6.
- Produces: final reviewed UI; no new public interfaces.

- [ ] **Step 1: Run the full static audit**

```bash
rg -n "Silkscreen|Press Start 2P|VT323|image-rendering: pixelated" index.html src/styles src/App.jsx src/components
rg -n "PIXEL PHOTOBOOTH|Retro Pixel" src/App.jsx src/components
rg -n "pixel-(box|btn|badge|input|overlay|progress)" src/App.jsx src/components
npm run build
```

Expected: all three commands return no matches; `npm run build` succeeds. `src/frames/frames.js` is excluded from the font audit because built-ins remain disabled.

- [ ] **Step 2: Check all four viewports for overflow**

For each of 320×568, 390×844, 768×1024, 1280×900:
1. Open `https://127.0.0.1:5173/` in Chrome/Safari.
2. Run `document.documentElement.scrollWidth <= window.innerWidth`.
3. Check header, shots selector, camera card, filter rail, thumbnails, and primary actions.

Expected: `true` at every viewport. If false, find the widest element with this snippet and reduce gaps/padding, add `min-w-0`, or move overflow into `.nb-filter-rail` only. Do not hide content just to pass the check.

```js
[...document.querySelectorAll('*')]
  .filter((el) => el.scrollWidth > document.documentElement.clientWidth)
  .map((el) => [el.tagName, el.className])
  .slice(0, 10)
```

- [ ] **Step 3: Fix accessibility gaps**

- Add `aria-label` to every icon-only button in `App.jsx`, `CameraView.jsx`, `StudioView.jsx`, and `FramePicker.jsx`: sound, help, info close, frame-picker close, studio back, camera switch, and tune close.
- Add `aria-pressed` to filter buttons and frame cards.
- Search `text-white` in the four UI files; keep it only on dark/video surfaces and the debug/toast panels, and remove it from pink, purple, teal, yellow, blue, and red accent fills.
- Add `role="dialog"`, `aria-modal="true"`, and an accessible title to the info modal and frame picker; keep Escape close.
- Verify the `:focus-visible` ring is visible on buttons, chips, segments, inputs, and frame cards.
- Add `@media (prefers-reduced-motion: reduce)` to disable `.anim-heart`, `.anim-blink`, `.animate-slide-up`, and press transitions.
- Do not use `outline: none` without a replacement.

- [ ] **Step 4: Final visual QA against the spec**

At 390×844 and 1280×900, compare to the supplied Neo Brutalism reference:
- cream `#f4ecdf` page; paper cards; 3px ink borders; hard offset shadows; 18px cards/12px buttons.
- Archivo Black only for display; Space Grotesk for UI; Space Mono only for metadata.
- pink primary, purple frames, teal upload/export, yellow surprise/help, blue secondary, red retake.
- camera and studio previews remain the visual focus; no pixel dots or pixelated rendering.
- selected chips/cards show more than color (border/shadow/pressed state).
- long frame name and 30-character caption remain readable.

Capture final screenshots:
```bash
google-chrome --headless=new --no-sandbox --ignore-certificate-errors --virtual-time-budget=3000 --window-size=390,844 --screenshot=/tmp/photo-us-final-390.png https://127.0.0.1:5173/
google-chrome --headless=new --no-sandbox --ignore-certificate-errors --virtual-time-budget=3000 --window-size=1280,900 --screenshot=/tmp/photo-us-final-1280.png https://127.0.0.1:5173/
```

- [ ] **Step 5: Manual functional smoke test**

In a real browser (and iPhone Safari if available):
1. Start camera; allow permission.
2. Switch between at least two live filters.
3. Change shots per strip to an allowed value; confirm unsupported values are disabled.
4. Capture a full session; confirm countdown, flash, and captured thumbnails.
5. Open the frame picker; select a custom frame; confirm the camera preview and studio use it.
6. Upload a photo; retake one slot; add a photo from the gallery in Studio.
7. Type a 30-character caption; confirm the counter stops at 30.
8. Export; confirm progress text, image download, and toast.
9. Open the info modal; close with Escape and the close button.

Expected: every behavior matches the pre-reskin app; only the chrome changed. If a functional regression appears, stop and debug it before committing.

- [ ] **Step 6: Final build and commit**

```bash
npm run build
git status --short
git add src/App.jsx src/components/CameraView.jsx src/components/StudioView.jsx src/components/FramePicker.jsx src/styles/neo-brutalism.css
git commit -m "feat: polish neo brutalism responsive UI"
```

Expected: build succeeds; `git status --short` shows only files intentionally changed. If Task 7 produced no fixes, skip the commit and report the clean tree; otherwise commit succeeds.

- [ ] **Step 7: Report the result**

Write a short handoff in the final response:
- branch and commit SHA
- backup path and SHA256
- screenshots captured
- viewports checked
- build result
- any remaining manual check (real iPhone Safari)
