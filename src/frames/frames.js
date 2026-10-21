// 9 Procedural Frames for Photobooth Web App
// 100% drawn in code (Canvas 2D) - zero external assets or logos
// Also loads custom PNG frames from public/frames/index.json

// Format date to "DD MMM YYYY" in id-ID locale as required
export function formatPhotoboothDate(d = new Date()) {
  try {
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  } catch {
    return '17 OKT 2026';
  }
}

export function drawRoundedRect(ctx, x, y, w, h, r = 16) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawCanvasHeart(ctx, cx, cy, size, color = '#ff5b99') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + size * 0.2);
  ctx.bezierCurveTo(cx, cy - size * 0.1, cx - size * 0.5, cy - size * 0.4, cx - size * 0.5, cy);
  ctx.bezierCurveTo(cx - size * 0.5, cy + size * 0.3, cx, cy + size * 0.5, cx, cy + size * 0.7);
  ctx.bezierCurveTo(cx, cy + size * 0.5, cx + size * 0.5, cy + size * 0.3, cx + size * 0.5, cy);
  ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.4, cx, cy - size * 0.1, cx, cy + size * 0.2);
  ctx.fill();
  ctx.restore();
}

export function drawSparkle(ctx, cx, cy, size, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const half = size / 2;
  ctx.moveTo(cx, cy - half);
  ctx.quadraticCurveTo(cx, cy, cx + half, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + half);
  ctx.quadraticCurveTo(cx, cy, cx - half, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - half);
  ctx.fill();
  ctx.restore();
}

/**
 * Built-in procedural frames (fallback for shot counts not covered by PNG frames)
 * Marked with builtin: true so they can be filtered for ACAK/randomization
 */
export const BUILTIN_FRAMES = [
  // 1. Classic Strip
  {
    id: 'classic-strip',
    name: 'Classic Strip',
    emoji: '🖤',
    layout: 'strip-4',
    allowedShots: [2, 3, 4],
    defaultShots: 4,
    padding: { top: 60, right: 60, bottom: 180, left: 60 },
    gap: 24,
    builtin: true,
    caption: { text: 'PHOTO-US', font: 'bold 32px "Silkscreen", sans-serif', color: '#111827', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, W - 40, H - 40);
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px "Silkscreen", monospace';
      ctx.fillText((captionText || 'PHOTO-US').toUpperCase(), W / 2, H - 100);

      ctx.fillStyle = '#6b7280';
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.fillText(dateStr || '', W / 2, H - 55);
      ctx.restore();
    }
  },

  // 2. Film Roll
  {
    id: 'film-roll',
    name: 'Film Roll',
    emoji: '🎞️',
    layout: 'strip-3',
    allowedShots: [3, 4],
    defaultShots: 3,
    padding: { top: 70, right: 80, bottom: 160, left: 80 },
    gap: 40,
    builtin: true,
    caption: { text: 'FILM 400', font: 'bold 28px monospace', color: '#f97316', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ffffff';
      const holeR = 12;
      const holeGap = 48;
      const startY = 50;
      for (let y = startY; y < H - 50; y += holeGap) {
        ctx.beginPath(); ctx.arc(40, y, holeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(W - 40, y, holeR, 0, Math.PI * 2); ctx.fill();
      }
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(captionText || 'FILM 400', W / 2, H - 80);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '18px monospace';
      ctx.fillText(dateStr || '', W / 2, H - 40);
      ctx.restore();
    }
  },

  // 3. Polaroid
  {
    id: 'polaroid',
    name: 'Polaroid',
    emoji: '📸',
    layout: 'strip-1',
    allowedShots: [1],
    defaultShots: 1,
    padding: { top: 80, right: 80, bottom: 240, left: 80 },
    gap: 0,
    builtin: true,
    caption: { text: 'PHOTO-US', font: 'bold 32px "Silkscreen", sans-serif', color: '#111827', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, W, H);
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      const s = slots[0];
      if (s) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.x - 12, s.y - 12, s.w + 24, s.h + 24 + 60);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 12, s.y - 12, s.w + 24, s.h + 24 + 60);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 28px "Silkscreen", monospace';
      ctx.fillText(captionText || 'PHOTO-US', W / 2, H - 70);
      ctx.fillStyle = '#6b7280';
      ctx.font = '18px monospace';
      ctx.fillText(dateStr || '', W / 2, H - 30);
      ctx.restore();
    }
  },

  // 4. Kawaii Sticker Sheet
  {
    id: 'kawaii',
    name: 'Kawaii Sticker Sheet',
    emoji: '🌸',
    layout: 'strip-4',
    allowedShots: [2, 3, 4, 6],
    defaultShots: 4,
    padding: { top: 90, right: 70, bottom: 220, left: 70 },
    gap: 30,
    builtin: true,
    caption: { text: '✨ memories ✨', font: 'bold 28px serif', color: '#ec4899', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#fff1f5');
      g.addColorStop(1, '#fdf2f8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < W; x += step) {
        for (let y = 0; y < H; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 30px serif';
      ctx.fillText(captionText || '✨ memories ✨', W / 2, H - 110);
      ctx.fillStyle = '#f472b6';
      ctx.font = '20px serif';
      ctx.fillText(dateStr || '', W / 2, H - 60);
      ctx.restore();
    }
  },

  // 5. Y2K Chrome
  {
    id: 'y2k-chrome',
    name: 'Y2K Chrome',
    emoji: '💿',
    layout: 'strip-4',
    allowedShots: [2, 3, 4, 6],
    defaultShots: 4,
    padding: { top: 70, right: 60, bottom: 180, left: 60 },
    gap: 20,
    builtin: true,
    caption: { text: 'Y2K CHROME', font: 'bold 36px monospace', color: '#06b6d4', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0f172a');
      g.addColorStop(0.5, '#1e293b');
      g.addColorStop(1, '#0f172a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const y = (H / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 36px monospace';
      ctx.fillText(captionText || 'Y2K CHROME', W / 2, H - 80);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px monospace';
      ctx.fillText(dateStr || '', W / 2, H - 40);
      ctx.restore();
    }
  },

  // 6. Comic Pop
  {
    id: 'comic-pop',
    name: 'Comic Pop',
    emoji: '💥',
    layout: 'strip-4',
    allowedShots: [2, 3, 4, 6],
    defaultShots: 4,
    padding: { top: 70, right: 60, bottom: 180, left: 60 },
    gap: 20,
    builtin: true,
    caption: { text: 'POW! WKWK', font: 'bold 32px "Press Start 2P", sans-serif', color: '#fff', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.fillStyle = '#facc15';
      const step = 20;
      for (let y = 10; y < H; y += step) {
        for (let x = 10; x < W; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      slots.forEach(s => {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      });
      const cx = W / 2;
      const cy = H - 90;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      drawRoundedRect(ctx, cx - 220, cy - 45, 440, 80, 20);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 32px "Press Start 2P", sans-serif';
      ctx.fillText(captionText || 'POW! WKWK', cx, cy + 8);
      ctx.font = '18px monospace';
      ctx.fillStyle = '#4b5563';
      ctx.fillText(dateStr || '', cx, H - 15);
      ctx.restore();
    }
  },

  // 7. Receipt Era
  {
    id: 'receipt',
    name: 'Receipt Era',
    emoji: '🧾',
    layout: 'strip-3',
    allowedShots: [2, 3, 4],
    defaultShots: 3,
    padding: { top: 90, right: 65, bottom: 320, left: 65 },
    gap: 30,
    builtin: true,
    caption: { text: 'PHOTOBOOTH STORE', font: 'bold 28px monospace', color: '#1f2937', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f3f4f6';
      const tooth = 20;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x < W; x += tooth * 2) {
        ctx.lineTo(x + tooth, tooth);
        ctx.lineTo(x + tooth * 2, 0);
      }
      ctx.closePath();
      ctx.fill();
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      slots.forEach(s => {
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 4;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      });
      ctx.font = 'bold 30px monospace';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.fillText(captionText || 'PHOTOBOOTH OFFICIAL STORE', W / 2, H - 250);
      ctx.font = '22px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`DATE: ${dateStr || ''}`, 80, H - 200);
      ctx.fillText('ITEM: 1x Sesi Foto Lucu .......... Rp0', 80, H - 165);
      ctx.fillText('ITEM: Kenangan Bersama ........ Rp0', 80, H - 135);
      ctx.font = 'bold 24px monospace';
      ctx.fillText('TOTAL: PRICELESS ♡', 80, H - 95);
      ctx.fillStyle = '#000000';
      const barX = W - 260;
      const barY = H - 180;
      for (let b = 0; b < 180; b += 6) {
        const w = (b % 4 === 0) ? 4 : 2;
        ctx.fillRect(barX + b, barY, w, 50);
      }
      ctx.font = '16px monospace';
      ctx.fillText('TERIMA KASIH!', W / 2 - 60, H - 40);
      ctx.restore();
    }
  },

  // 8. Neon Sign
  {
    id: 'neon-sign',
    name: 'Neon Sign',
    emoji: '🌙',
    layout: 'strip-1',
    allowedShots: [1],
    defaultShots: 1,
    padding: { top: 80, right: 80, bottom: 220, left: 80 },
    gap: 0,
    builtin: true,
    caption: { text: 'NEON NIGHTS', font: 'bold 44px sans-serif', color: '#ff007f', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, W, H);
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      const s = slots[0];
      if (s) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      }
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Silkscreen", sans-serif';
      ctx.fillText(captionText || 'NEON NIGHTS', W / 2, H - 110);
      ctx.fillText(captionText || 'NEON NIGHTS', W / 2, H - 110);
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#00f0ff';
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.fillText(dateStr || '', W / 2, H - 55);
      ctx.restore();
    }
  },

  // 9. Batik Kondangan
  {
    id: 'batik-kondangan',
    name: 'Batik Kondangan',
    emoji: '🇮🇩',
    layout: 'strip-1',
    allowedShots: [1],
    defaultShots: 1,
    padding: { top: 90, right: 90, bottom: 220, left: 90 },
    gap: 0,
    builtin: true,
    caption: { text: 'Momen Bahagia', font: 'bold 42px serif', color: '#fef08a', y: 'bottom' },
    drawBackground: (ctx, W, H) => {
      ctx.fillStyle = '#3f2e1e';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
      ctx.lineWidth = 2;
      const kStep = 50;
      for (let x = 25; x < W; x += kStep) {
        for (let y = 25; y < H; y += kStep) {
          if (x < 110 || x > W - 110 || y < 110 || y > H - 110) {
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + kStep / 2, y + kStep / 2, 22, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    },
    drawDecor: (ctx, W, H, slots, captionText, dateStr) => {
      ctx.save();
      const s = slots[0];
      if (s) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 8;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x + 6, s.y + 6, s.w - 12, s.h - 12);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 44px serif';
      ctx.fillText(captionText || 'Momen Bahagia', W / 2, H - 115);
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'italic 24px serif';
      ctx.fillText(dateStr || '', W / 2, H - 65);
      ctx.restore();
    }
  }
];

// Built-in procedural frames are disabled for now. Custom PNG frames are the
// only frames shown in the app. Flip this flag to true to re-enable them.
const ENABLE_BUILTIN_FRAMES = false;

// Simple in-memory cache for loaded frame index
let cachedFramesIndex = null;

/**
 * Load custom PNG frames from public/frames/index.json
 * Returns array of frame objects with type: 'image'
 */
export async function loadCustomFrames() {
  if (cachedFramesIndex) return cachedFramesIndex;

  try {
    const response = await fetch('/frames/index.json');
    if (!response.ok) {
      console.log('[frames] No custom frames index found at /frames/index.json');
      return [];
    }
    const frames = await response.json();
    // Mark as custom (non-builtin)
    frames.forEach(f => {
      f.builtin = false;
      f.type = 'image';
      // Ensure emoji fallback
      if (!f.emoji) f.emoji = '🖼️';
    });
    cachedFramesIndex = frames;
    console.log('[frames] Loaded', frames.length, 'custom PNG frame(s)');
    return frames;
  } catch (e) {
    console.warn('[frames] Failed to load custom frames index:', e.message);
    return [];
  }
}

/**
 * Get all enabled frames. Built-in procedural frames are disabled via
 * ENABLE_BUILTIN_FRAMES, so this returns custom PNG frames only.
 */
export async function getAllFrames() {
  const customFrames = await loadCustomFrames();
  return ENABLE_BUILTIN_FRAMES ? [...customFrames, ...BUILTIN_FRAMES] : customFrames;
}

/**
 * Get frame by ID (custom PNG frames only while built-ins are disabled)
 */
export async function getFrameById(id) {
  const frames = await getAllFrames();
  return frames.find(f => f.id === id) || frames[0] || null;
}

/**
 * Get frames that support a specific shot count
 * Returns custom frames first, then built-in when enabled
 */
export async function getFramesForShots(shots) {
  const frames = await getAllFrames();
  return frames.filter(f => f.allowedShots?.includes(shots));
}

/**
 * Get PNG frames that support a specific shot count (excludes built-in)
 */
export async function getCustomFramesForShots(shots) {
  const customFrames = await loadCustomFrames();
  return customFrames.filter(f => f.allowedShots?.includes(shots));
}

/**
 * Slot detection for PNG frames
 * Loads the PNG into an offscreen canvas, downscale alpha mask,
 * threshold alpha < 10, flood-fill connected transparent regions,
 * return bounding boxes + estimated corner radius, sorted top-to-bottom then left-to-right
 */
const slotDetectionCache = new Map();

export async function detectSlots(frame, shots) {
  const cacheKey = `${frame.id}-${shots}`;
  if (slotDetectionCache.has(cacheKey)) {
    return slotDetectionCache.get(cacheKey);
  }

  // Check if meta.json overrides slots
  if (frame.meta?.slots?.[String(shots)]) {
    const slots = frame.meta.slots[String(shots)];
    slotDetectionCache.set(cacheKey, slots);
    return slots;
  }

  const pngUrl = frame.pngFiles?.[String(shots)];
  if (!pngUrl) {
    console.warn(`[frames] No PNG file for ${frame.id} with ${shots} shots`);
    return [];
  }

  try {
    const img = await loadImage(pngUrl);
    await img.decode();

    // Create offscreen canvas at 1/4 resolution for faster processing
    const scale = 0.25;
    const cw = Math.round(img.width * scale);
    const ch = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);

    const imageData = ctx.getImageData(0, 0, cw, ch);
    const data = imageData.data;
    const visited = new Uint8Array(cw * ch);

    // Threshold alpha < 10 to find transparent regions
    const isTransparent = (i) => data[i * 4 + 3] < 10;

    const slots = [];
    const minArea = (cw * ch) * 0.01; // 1% of total area

    // Flood fill to find connected transparent regions
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const idx = y * cw + x;
        if (visited[idx] || !isTransparent(idx)) continue;

        // BFS flood fill
        const queue = [idx];
        visited[idx] = 1;
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;

        while (queue.length) {
          const cur = queue.shift();
          const cy = Math.floor(cur / cw);
          const cx = cur % cw;
          count++;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);

          // 4-connected neighbors
          const neighbors = [
            cx > 0 ? cur - 1 : -1,
            cx < cw - 1 ? cur + 1 : -1,
            cy > 0 ? cur - cw : -1,
            cy < ch - 1 ? cur + cw : -1
          ];
          for (const n of neighbors) {
            if (n >= 0 && !visited[n] && isTransparent(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        // Ignore regions smaller than 1% of area
        if (count < minArea) continue;

        // Scale back to original image coordinates
        const slot = {
          x: Math.round(minX / scale),
          y: Math.round(minY / scale),
          w: Math.round((maxX - minX + 1) / scale),
          h: Math.round((maxY - minY + 1) / scale),
          r: 0 // Corner radius estimation could be added
        };
        slots.push(slot);
      }
    }

    // Sort top-to-bottom, then left-to-right
    slots.sort((a, b) => a.y - b.y || a.x - b.x);

    // Validate count
    if (slots.length !== shots) {
      console.error(`[frames] Slot detection mismatch for ${frame.id} (${shots} shots): expected ${shots}, found ${slots.length}`);
    }

    slotDetectionCache.set(cacheKey, slots);
    return slots;
  } catch (e) {
    console.error(`[frames] Slot detection failed for ${frame.id}:`, e);
    return [];
  }
}

/**
 * Render a frame (PNG or built-in) to canvas
 * Order: underlay → photos (cover-fit into slots, clipped to slot shape) → frame PNG on top
 */
export async function renderFrame(ctx, frame, photos, shots, options = {}) {
  const { caption = '', dateStr = '', canvasW, canvasH } = options;

  if (frame.type === 'image') {
    return renderImageFrame(ctx, frame, photos, shots, { caption, dateStr, canvasW, canvasH });
  } else {
    return renderBuiltinFrame(ctx, frame, photos, shots, { caption, dateStr, canvasW, canvasH });
  }
}

/**
 * Render a custom PNG frame
 */
async function renderImageFrame(ctx, frame, photos, shots, { caption, dateStr, canvasW, canvasH }) {
  const pngUrl = frame.pngFiles?.[String(shots)];
  if (!pngUrl) {
    console.warn(`[frames] No PNG for ${frame.id} with ${shots} shots, falling back`);
    return false;
  }

  try {
    // Detect slots if not cached
    const slots = await detectSlots(frame, shots);
    if (slots.length === 0) {
      console.warn(`[frames] No slots detected for ${frame.id} ${shots}`);
      return false;
    }

    // Load frame PNG
    const frameImg = await loadImage(pngUrl);
    await frameImg.decode();

    // Load underlay if present
    let underlayImg = null;
    if (frame.underlay) {
      underlayImg = await loadImage(frame.underlay);
      await underlayImg.decode();
    }

    // Calculate canvas size from frame image if not provided
    const W = canvasW || frameImg.width;
    const H = canvasH || frameImg.height;

    // Slots are stored in the frame's native pixel space (meta.json). When
    // exporting at a larger canvas size they must be scaled with the frame,
    // otherwise photos are drawn at native size while the frame is upscaled.
    const frameScaleX = W / frameImg.width;
    const frameScaleY = H / frameImg.height;

    // Draw underlay first
    if (underlayImg) {
      ctx.drawImage(underlayImg, 0, 0, W, H);
    }

    // Photos may be downscaled into the slot, so ask for high-quality resampling.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fit mode is optional per frame (`meta.fit`) or per slot (`slot.fit`).
    // "cover" fills the slot and crops (default, full-bleed).
    // "contain" shows the whole photo and leaves a matte on the empty sides.
    const defaultFit = String(frame.meta?.fit || 'cover').toLowerCase();
    const defaultMatte = frame.meta?.matte;

    // Draw photos into slots, clipped to the slot
    for (let i = 0; i < Math.min(photos.length, slots.length); i++) {
      const photoData = photos[i];
      if (!photoData) continue;

      const nativeSlot = slots[i];
      const slot = {
        x: nativeSlot.x * frameScaleX,
        y: nativeSlot.y * frameScaleY,
        w: nativeSlot.w * frameScaleX,
        h: nativeSlot.h * frameScaleY,
        r: (nativeSlot.r || 0) * Math.min(frameScaleX, frameScaleY)
      };

      const fit = String(nativeSlot.fit || defaultFit).toLowerCase();
      // Default matte for contain mode; override with meta.matte (or set
      // "transparent" if the frame's underlay should show through).
      const matte = nativeSlot.matte || defaultMatte ||
        (fit === 'contain' ? '#f5efe6' : null);

      const photoImg = await loadImage(photoData);
      await photoImg.decode();

      ctx.save();
      // Create rounded rect clip if slot has radius
      if (slot.r > 0) {
        drawRoundedRect(ctx, slot.x, slot.y, slot.w, slot.h, slot.r);
      } else {
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, slot.w, slot.h);
      }
      ctx.clip();

      if (fit === 'contain' && matte) {
        ctx.fillStyle = matte;
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
      }

      // contain = whole photo visible (letterbox), cover = fill the slot
      const scale = fit === 'contain'
        ? Math.min(slot.w / photoImg.width, slot.h / photoImg.height)
        : Math.max(slot.w / photoImg.width, slot.h / photoImg.height);
      const drawW = photoImg.width * scale;
      const drawH = photoImg.height * scale;
      const drawX = slot.x + (slot.w - drawW) / 2;
      const drawY = slot.y + (slot.h - drawH) / 2;
      ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // Draw frame PNG on top
    ctx.drawImage(frameImg, 0, 0, W, H);

    // Draw caption/date only if meta defines them
    if (frame.meta?.caption || frame.meta?.dateStamp) {
      // This would be drawn here if needed
      // For now, PNG frames don't get auto caption/date per spec
    }

    return true;
  } catch (e) {
    console.error(`[frames] Failed to render image frame ${frame.id}:`, e);
    return false;
  }
}

/**
 * Render a built-in procedural frame
 */
async function renderBuiltinFrame(ctx, frame, photos, shots, { caption, dateStr, canvasW, canvasH }) {
  // Calculate canvas size based on frame layout
  const layoutMap = {
    'strip-4': { cols: 1, rows: 4, aspect: 3 / 4 },
    'strip-3': { cols: 1, rows: 3, aspect: 3 / 4 },
    'strip-2': { cols: 1, rows: 2, aspect: 3 / 4 },
    'strip-1': { cols: 1, rows: 1, aspect: 3 / 4 },
  };
  const layout = layoutMap[frame.layout] || { cols: 1, rows: 4, aspect: 3 / 4 };

  const slotW = canvasW ? (canvasW - (frame.padding?.left || 60) - (frame.padding?.right || 60)) / layout.cols : 480;
  const slotH = Math.round(slotW / layout.aspect);
  const padding = frame.padding || { top: 60, right: 60, bottom: 180, left: 60 };
  const gap = frame.gap || 24;

  const W = canvasW || (padding.left + padding.right + layout.cols * slotW + (layout.cols - 1) * gap);
  const H = canvasH || (padding.top + padding.bottom + layout.rows * slotH + (layout.rows - 1) * gap);

  // Draw background
  if (frame.drawBackground) {
    frame.drawBackground(ctx, W, H);
  }

  // Calculate slot positions
  const slots = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const x = padding.left + col * (slotW + gap);
      const y = padding.top + row * (slotH + gap);
      slots.push({ x, y, w: slotW, h: slotH, index: row * layout.cols + col });
    }
  }

  // Draw photos into slots
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let i = 0; i < Math.min(photos.length, slots.length); i++) {
    const photoData = photos[i];
    const slot = slots[i];
    if (!photoData) continue;

    const photoImg = await loadImage(photoData);
    await photoImg.decode();

    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.clip();

    const scale = Math.max(slot.w / photoImg.width, slot.h / photoImg.height);
    const drawW = photoImg.width * scale;
    const drawH = photoImg.height * scale;
    const drawX = slot.x + (slot.w - drawW) / 2;
    const drawY = slot.y + (slot.h - drawH) / 2;
    ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Draw decorations (borders, caption, date)
  if (frame.drawDecor) {
    frame.drawDecor(ctx, W, H, slots, caption, dateStr);
  }

  return true;
}

/**
 * Helper to load an image and return a promise
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Custom PNG frames are usually exported at a much smaller size than the
// source artwork (e.g. 236x709). A fixed 3x export leaves them below the
// physical resolution of a modern phone screen, so the saved photo looks soft
// even when the uploaded photo is high resolution. Upscale the export until
// the frame is at least this wide, with a sane cap and the iOS limit guard
// below as the final safety net.
const MIN_CUSTOM_EXPORT_WIDTH = 1400;
const MAX_CUSTOM_EXPORT_SCALE = 6;

/**
 * Export frame at native resolution (for PNG frames) or calculated size (for built-in)
 * Respects iOS Safari canvas limits (max 16M pixels, max side 8192)
 */
export async function exportFrame(frame, photos, shots, options = {}) {
  const { caption = '', dateStr = '', scale = 1 } = options;

  // Determine target canvas size
  let targetW, targetH;

  if (frame.type === 'image') {
    const pngUrl = frame.pngFiles?.[String(shots)];
    if (pngUrl) {
      const img = await loadImage(pngUrl);
      await img.decode();
      const requestedScale = Math.max(1, Number(scale) || 1);
      const widthBasedScale = Math.ceil(MIN_CUSTOM_EXPORT_WIDTH / img.width);
      const exportScale = Math.max(
        requestedScale,
        Math.min(widthBasedScale, MAX_CUSTOM_EXPORT_SCALE)
      );
      targetW = img.width * exportScale;
      targetH = img.height * exportScale;
    }
  } else {
    // Built-in: calculate from layout
    const layoutMap = {
      'strip-4': { cols: 1, rows: 4, aspect: 3 / 4 },
      'strip-3': { cols: 1, rows: 3, aspect: 3 / 4 },
      'strip-2': { cols: 1, rows: 2, aspect: 3 / 4 },
      'strip-1': { cols: 1, rows: 1, aspect: 3 / 4 },
    };
    const layout = layoutMap[frame.layout] || { cols: 1, rows: 4, aspect: 3 / 4 };
    const slotW = 600 * scale;
    const slotH = Math.round(slotW / layout.aspect);
    const padding = frame.padding || { top: 60, right: 60, bottom: 180, left: 60 };
    const gap = frame.gap || 24;
    targetW = padding.left + padding.right + layout.cols * slotW + (layout.cols - 1) * gap;
    targetH = padding.top + padding.bottom + layout.rows * slotH + (layout.rows - 1) * gap;
  }

  // Check iOS Safari canvas limits
  const maxPixels = 16_000_000;
  const maxSide = 8192;
  let finalW = targetW;
  let finalH = targetH;
  if (finalW * finalH > maxPixels || finalW > maxSide || finalH > maxSide) {
    const ratio = Math.min(maxSide / finalW, maxSide / finalH, Math.sqrt(maxPixels / (finalW * finalH)));
    finalW = Math.round(finalW * ratio);
    finalH = Math.round(finalH * ratio);
    console.warn(`[frames] Downsampling export from ${targetW}x${targetH} to ${finalW}x${finalH} due to canvas limits`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d');

  // Scale the render
  ctx.scale(finalW / targetW, finalH / targetH);

  const success = await renderFrame(ctx, frame, photos, shots, {
    caption,
    dateStr,
    canvasW: targetW,
    canvasH: targetH
  });

  if (!success) return null;

  return canvas;
}

/**
 * Get frame geometry (width, height, slots) for a given frame and shot count
 * Returns dimensions in pixels matching the frame's design coordinates
 */
export async function getFrameGeometry(frame, shots) {
  if (frame.type === 'image') {
    const pngUrl = frame.pngFiles?.[String(shots)];
    if (!pngUrl) {
      // Fallback to a reasonable default
      return { width: 480, height: 640, slots: [] };
    }
    const img = await loadImage(pngUrl);
    await img.decode();
    const slots = await detectSlots(frame, shots);
    return { width: img.width, height: img.height, slots };
  } else {
    // Built-in frames - calculate from layout
    const layoutMap = {
      'strip-4': { cols: 1, rows: 4, aspect: 3 / 4 },
      'strip-3': { cols: 1, rows: 3, aspect: 3 / 4 },
      'strip-2': { cols: 1, rows: 2, aspect: 3 / 4 },
      'strip-1': { cols: 1, rows: 1, aspect: 3 / 4 },
    };
    const layout = layoutMap[frame.layout] || { cols: 1, rows: 4, aspect: 3 / 4 };
    const slotW = 600; // Base slot width for calculation
    const slotH = Math.round(slotW / layout.aspect);
    const padding = frame.padding || { top: 60, right: 60, bottom: 180, left: 60 };
    const gap = frame.gap || 24;
    const W = padding.left + padding.right + layout.cols * slotW + (layout.cols - 1) * gap;
    const H = padding.top + padding.bottom + layout.rows * slotH + (layout.rows - 1) * gap;

    // Calculate slots
    const slots = [];
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const x = padding.left + col * (slotW + gap);
        const y = padding.top + row * (slotH + gap);
        slots.push({ x, y, w: slotW, h: slotH, index: row * layout.cols + col });
      }
    }

    return { width: W, height: H, slots };
  }
}

/**
 * Clear slot detection cache (useful for debugging or when frames change)
 */
export function clearSlotCache() {
  slotDetectionCache.clear();
}

/**
 * Debug: draw detected slot rectangles on frame (for ?debugframes=1)
 */
export async function drawDebugSlots(ctx, frame, shots, canvasW, canvasH) {
  if (frame.type !== 'image') return;

  const slots = await detectSlots(frame, shots);
  if (slots.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#ff0000';

  slots.forEach((slot, i) => {
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    ctx.fillText(`${i + 1}`, slot.x + 10, slot.y + 30);
  });
  ctx.restore();
}