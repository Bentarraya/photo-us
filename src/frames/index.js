import { getAllFrames, getFrameById, getFramesForShots, getCustomFramesForShots, renderFrame, exportFrame, detectSlots, clearSlotCache, drawDebugSlots, formatPhotoboothDate, getFrameGeometry } from './frames.js';

// Re-export all frame functions
export {
  getAllFrames,
  getFrameById,
  getFramesForShots,
  getCustomFramesForShots,
  renderFrame,
  exportFrame,
  detectSlots,
  clearSlotCache,
  drawDebugSlots,
  formatPhotoboothDate,
  getFrameGeometry
};

// For backwards compatibility, provide a sync version that returns built-in frames
// This is used by components that need immediate access
import { BUILTIN_FRAMES } from './frames.js';
export const FRAMES_REGISTRY = BUILTIN_FRAMES;

// Helper to load image
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Computes slot positions and canvas dimensions for built-in frames
 * (for backwards compatibility with existing code)
 */
export function computeFrameGeometry(frameDef, shotsCount) {
  const W = 1080;
  const pad = frameDef.padding || { top: 60, right: 60, bottom: 180, left: 60 };
  const gap = frameDef.gap || 24;

  let H = 1400;
  const slots = [];

  const isStrip = frameDef.layout?.startsWith('strip');

  if (isStrip) {
    const defaultCount = frameDef.defaultShots || (frameDef.layout === 'strip-3' ? 3 : 4);
    const numShots = shotsCount ? Math.max(1, Math.min(8, Number(shotsCount))) : defaultCount;
    const slotW = W - pad.left - pad.right;

    let slotH;
    if (numShots === 1) {
      slotH = Math.round(slotW * 0.95);
    } else if (numShots === 2) {
      slotH = Math.round(slotW * 0.82);
    } else if (numShots === 3) {
      slotH = Math.round(slotW * 0.76);
    } else if (numShots === 4) {
      slotH = Math.round(slotW * 0.72);
    } else {
      slotH = Math.round(slotW * 0.65);
    }

    H = pad.top + (slotH * numShots) + (gap * (numShots - 1)) + pad.bottom;
    for (let i = 0; i < numShots; i++) {
      slots.push({
        x: pad.left,
        y: pad.top + i * (slotH + gap),
        w: slotW,
        h: slotH
      });
    }
  } else if (frameDef.layout === 'grid-2x2' || frameDef.layout?.startsWith('grid')) {
    const defaultCount = frameDef.defaultShots || 4;
    const numShots = shotsCount ? Math.max(1, Math.min(8, Number(shotsCount))) : defaultCount;
    const cols = 2;
    const rows = Math.ceil(numShots / cols);
    const slotW = Math.round((W - pad.left - pad.right - gap * (cols - 1)) / cols);
    const slotH = Math.round(slotW * 0.88);
    H = pad.top + (slotH * rows) + (gap * (rows - 1)) + pad.bottom;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (slots.length < numShots) {
          slots.push({
            x: pad.left + c * (slotW + gap),
            y: pad.top + r * (slotH + gap),
            w: slotW,
            h: slotH
          });
        }
      }
    }
  } else {
    // Single
    const slotW = W - pad.left - pad.right;
    const slotH = Math.round(slotW * 0.95);
    H = pad.top + slotH + pad.bottom;
    slots.push({
      x: pad.left,
      y: pad.top,
      w: slotW,
      h: slotH
    });
  }

  return { W, H, slots };
}

/**
 * Render complete composite photobooth image for built-in frames
 * (for backwards compatibility with existing code)
 */
export async function renderPhotoboothComposite({
  photos,
  frameDef,
  captionText = '',
  dateStr = formatPhotoboothDate(),
  stickers = [],
  shotsCount
}) {
  const loadedImgs = await Promise.all(photos.map(p => loadImage(p)));
  const effectiveShots = shotsCount || (photos && photos.length > 0 ? photos.length : undefined);
  const { W, H, slots } = computeFrameGeometry(frameDef, effectiveShots);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Draw Background
  if (frameDef.drawBackground) {
    frameDef.drawBackground(ctx, W, H);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Draw Photos into Slots
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const img = loadedImgs[i % loadedImgs.length];
    if (img) {
      const radius = frameDef.id === 'kawaii-pastel' ? 24 : 0;
      drawCoverFitImage(ctx, img, slot, radius);
    }
  }

  // 3. Draw Decor & Caption
  if (frameDef.drawDecor) {
    const activeCaption = captionText !== undefined ? captionText : (frameDef.caption?.text || '');
    frameDef.drawDecor(ctx, W, H, slots, activeCaption, dateStr);
  }

  // 4. Draw optional user placed stickers
  for (const st of stickers) {
    ctx.save();
    const sx = (st.x / 100) * W;
    const sy = (st.y / 100) * H;
    const sz = st.size || 70;
    ctx.translate(sx, sy);
    if (st.rotation) ctx.rotate((st.rotation * Math.PI) / 180);

    if (st.emoji) {
      ctx.font = `${sz}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.emoji, 0, 0);
    } else if (st.text) {
      ctx.font = 'bold 28px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textW = ctx.measureText(st.text).width + 30;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-textW / 2, -24, textW, 48);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(-textW / 2, -24, textW, 48);
      ctx.fillStyle = '#000000';
      ctx.fillText(st.text, 0, 4);
    }
    ctx.restore();
  }

  return canvas;
}

/**
 * Helper to draw image cover-fit with optional rounded corners
 */
export function drawCoverFitImage(ctx, img, slot, radius = 0) {
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.moveTo(slot.x + radius, slot.y);
    ctx.lineTo(slot.x + slot.w - radius, slot.y);
    ctx.quadraticCurveTo(slot.x + slot.w, slot.y, slot.x + slot.w, slot.y + radius);
    ctx.lineTo(slot.x + slot.w, slot.y + slot.h - radius);
    ctx.quadraticCurveTo(slot.x + slot.w, slot.y + slot.h, slot.x + slot.w - radius, slot.y + slot.h);
    ctx.lineTo(slot.x + radius, slot.y + slot.h);
    ctx.quadraticCurveTo(slot.x, slot.y + slot.h, slot.x, slot.y + slot.h - radius);
    ctx.lineTo(slot.x, slot.y + radius);
    ctx.quadraticCurveTo(slot.x, slot.y, slot.x + radius, slot.y);
    ctx.closePath();
    ctx.clip();
  }

  const imgAspect = img.width / img.height;
  const slotAspect = slot.w / slot.h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (imgAspect > slotAspect) {
    sw = img.height * slotAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / slotAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
  ctx.restore();
}