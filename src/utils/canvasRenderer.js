// Canvas Renderer for high-resolution photo-strip export

// Helper to load image
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

// Draw pixelated decorative border
function drawPixelBorder(ctx, x, y, width, height, borderWidth = 6, borderColor = '#000000') {
  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x, y, width, height);

  // Corner pixel accent blocks
  const cornerSize = borderWidth * 2;
  ctx.fillStyle = borderColor;
  ctx.fillRect(x - borderWidth/2, y - borderWidth/2, cornerSize, cornerSize);
  ctx.fillRect(x + width - cornerSize + borderWidth/2, y - borderWidth/2, cornerSize, cornerSize);
  ctx.fillRect(x - borderWidth/2, y + height - cornerSize + borderWidth/2, cornerSize, cornerSize);
  ctx.fillRect(x + width - cornerSize + borderWidth/2, y + height - cornerSize + borderWidth/2, cornerSize, cornerSize);
  ctx.restore();
}

// Draw cute pixel heart
function drawPixelHeart(ctx, x, y, size = 16, color = '#ff4d79') {
  ctx.save();
  ctx.fillStyle = color;
  const p = size / 8; // 8x8 pixel heart matrix
  const heartMatrix = [
    [0,1,1,0,0,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0,0]
  ];
  for (let r = 0; r < heartMatrix.length; r++) {
    for (let c = 0; c < heartMatrix[r].length; c++) {
      if (heartMatrix[r][c]) {
        ctx.fillRect(x + c * p, y + r * p, p, p);
      }
    }
  }
  ctx.restore();
}

// Draw cute pixel star
function drawPixelStar(ctx, x, y, size = 16, color = '#facc15') {
  ctx.save();
  ctx.fillStyle = color;
  const p = size / 7;
  const starMatrix = [
    [0,0,0,1,0,0,0],
    [0,0,1,1,1,0,0],
    [1,1,1,1,1,1,1],
    [0,1,1,1,1,1,0],
    [0,1,1,1,1,1,0],
    [0,1,0,0,0,1,0]
  ];
  for (let r = 0; r < starMatrix.length; r++) {
    for (let c = 0; c < starMatrix[r].length; c++) {
      if (starMatrix[r][c]) {
        ctx.fillRect(x + c * p, y + r * p, p, p);
      }
    }
  }
  ctx.restore();
}

// Draw cropped and centered image into slot
function drawCroppedImage(ctx, img, x, y, targetWidth, targetHeight) {
  const imgAspect = img.width / img.height;
  const targetAspect = targetWidth / targetHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = img.width;
  let sourceHeight = img.height;

  if (imgAspect > targetAspect) {
    sourceWidth = img.height * targetAspect;
    sourceX = (img.width - sourceWidth) / 2;
  } else {
    sourceHeight = img.width / targetAspect;
    sourceY = (img.height - sourceHeight) / 2;
  }

  ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, targetWidth, targetHeight);
}

export async function renderPhotoboothCanvas({
  photos,
  layout = 'strip4',
  theme,
  filterCSS = 'none',
  customText = 'PHOTO-US ♡ MEMORY',
  subText = 'TOGETHER FOREVER',
  showDate = true,
  placedStickers = []
}) {
  const loadedImages = await Promise.all(photos.map(p => loadImage(p)));

  let canvasW = 1200;
  let canvasH = 3600;

  if (layout === 'grid4') {
    canvasW = 1800;
    canvasH = 2200;
  } else if (layout === 'single') {
    canvasW = 1200;
    canvasH = 1600;
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // Disable smoothing for crisp pixel rendering where appropriate
  ctx.imageSmoothingEnabled = true;

  // 1. Draw Background Frame
  ctx.fillStyle = theme.bg || '#ffe4ec';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Decorative subtle pixel dot pattern on background
  if (theme.dotColor) {
    ctx.fillStyle = theme.dotColor;
    const dotSpacing = 32;
    for (let px = 16; px < canvasW; px += dotSpacing) {
      for (let py = 16; py < canvasH; py += dotSpacing) {
        ctx.fillRect(px, py, 4, 4);
      }
    }
  }

  // 2. Outer Frame Border
  drawPixelBorder(ctx, 24, 24, canvasW - 48, canvasH - 48, 12, '#18181b');
  drawPixelBorder(ctx, 36, 36, canvasW - 72, canvasH - 72, 4, theme.frameBorder || '#ff4d79');

  // 3. Layout photo coordinates
  let photoSlots = [];

  if (layout === 'strip4') {
    const padX = 80;
    const padTop = 100;
    const photoW = canvasW - (padX * 2);
    const photoH = 700;
    const gap = 44;

    for (let i = 0; i < 4; i++) {
      photoSlots.push({
        x: padX,
        y: padTop + i * (photoH + gap),
        w: photoW,
        h: photoH
      });
    }
  } else if (layout === 'grid4') {
    const padX = 80;
    const padTop = 100;
    const gap = 40;
    const photoW = (canvasW - (padX * 2) - gap) / 2;
    const photoH = 800;

    // 2x2 grid
    photoSlots = [
      { x: padX, y: padTop, w: photoW, h: photoH },
      { x: padX + photoW + gap, y: padTop, w: photoW, h: photoH },
      { x: padX, y: padTop + photoH + gap, w: photoW, h: photoH },
      { x: padX + photoW + gap, y: padTop + photoH + gap, w: photoW, h: photoH },
    ];
  } else if (layout === 'single') {
    const padX = 90;
    const padTop = 110;
    const photoW = canvasW - (padX * 2);
    const photoH = 1050;
    photoSlots.push({ x: padX, y: padTop, w: photoW, h: photoH });
  }

  // 4. Draw each photo into its slot with frame borders
  for (let i = 0; i < photoSlots.length; i++) {
    const slot = photoSlots[i];
    const img = loadedImages[i % loadedImages.length];

    if (img) {
      // Photo backing card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(slot.x - 6, slot.y - 6, slot.w + 12, slot.h + 12);

      // Draw photo with filter applied
      ctx.save();
      if (filterCSS && filterCSS !== 'none') {
        ctx.filter = filterCSS;
      }
      drawCroppedImage(ctx, img, slot.x, slot.y, slot.w, slot.h);
      ctx.restore();

      // Photo frame borders
      drawPixelBorder(ctx, slot.x, slot.y, slot.w, slot.h, 8, '#18181b');
    }
  }

  // 5. Draw Bottom Brand & Date Area
  const bottomY = layout === 'strip4' 
    ? 3100 
    : (layout === 'grid4' ? 1830 : 1240);

  ctx.save();
  ctx.textAlign = 'center';

  // Decorative icon or hearts
  if (theme.id === 'retro-arcade') {
    drawPixelStar(ctx, canvasW / 2 - 180, bottomY + 40, 36, '#facc15');
    drawPixelStar(ctx, canvasW / 2 + 150, bottomY + 40, 36, '#facc15');
  } else {
    drawPixelHeart(ctx, canvasW / 2 - 180, bottomY + 40, 36, theme.accent || '#ff4d79');
    drawPixelHeart(ctx, canvasW / 2 + 150, bottomY + 40, 36, theme.accent || '#ff4d79');
  }

  // Main Caption Text
  ctx.fillStyle = theme.textColor || '#18181b';
  ctx.font = 'bold 44px "Silkscreen", "Press Start 2P", monospace';
  ctx.fillText(customText.toUpperCase(), canvasW / 2, bottomY + 80);

  // Subtitle / Tagline
  ctx.font = '26px "Silkscreen", "VT323", monospace';
  ctx.fillStyle = theme.textColor || '#4b5563';
  ctx.fillText(subText.toUpperCase(), canvasW / 2, bottomY + 140);

  // Date Stamp & App credit
  if (showDate) {
    const dateStr = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '.');

    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`★ ${dateStr} • PHOTO-US PIXEL BOOTH ★`, canvasW / 2, bottomY + 200);
  }

  ctx.restore();

  // 6. Draw Placed Stickers
  for (const sticker of placedStickers) {
    ctx.save();
    // Normalize coordinates to canvas size
    const sx = (sticker.x / 100) * canvasW;
    const sy = (sticker.y / 100) * canvasH;
    const size = sticker.size || 80;

    ctx.translate(sx, sy);
    if (sticker.rotation) {
      ctx.rotate((sticker.rotation * Math.PI) / 180);
    }

    if (sticker.emoji) {
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.emoji, 0, 0);
    } else if (sticker.text) {
      // Pixel badge sticker
      ctx.font = 'bold 28px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textW = ctx.measureText(sticker.text).width + 30;
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-textW / 2, -24, textW, 48);
      drawPixelBorder(ctx, -textW / 2, -24, textW, 48, 4, '#18181b');
      ctx.fillStyle = '#18181b';
      ctx.fillText(sticker.text, 0, 4);
    }

    ctx.restore();
  }

  return canvas;
}
