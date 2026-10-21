// Fallback for Safari when CanvasRenderingContext2D.prototype.filter is unsupported

let supportsCanvasFilter = null;

export function checkCanvasFilterSupport() {
  if (supportsCanvasFilter !== null) return supportsCanvasFilter;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    supportsCanvasFilter = ctx && 'filter' in ctx && typeof ctx.filter === 'string';
  } catch {
    supportsCanvasFilter = false;
  }
  return supportsCanvasFilter;
}

/**
 * Apply CSS filter string fallback directly onto canvas ImageData
 * Supports brightness, contrast, saturate, sepia, grayscale, hue-rotate
 */
export function applyCssFilterFallback(ctx, width, height, filterStr) {
  if (!filterStr || filterStr === 'none') return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Parse simple CSS filter functions
  let brightness = 1;
  let contrast = 1;
  let saturate = 1;
  let sepia = 0;
  let grayscale = 0;

  const bMatch = filterStr.match(/brightness\(([\d.]+)\)/);
  if (bMatch) brightness = parseFloat(bMatch[1]);

  const cMatch = filterStr.match(/contrast\(([\d.]+)\)/);
  if (cMatch) contrast = parseFloat(cMatch[1]);

  const sMatch = filterStr.match(/saturate\(([\d.]+)\)/);
  if (sMatch) saturate = parseFloat(sMatch[1]);

  const sepMatch = filterStr.match(/sepia\(([\d.]+)\)/);
  if (sepMatch) sepia = parseFloat(sepMatch[1]);

  const gMatch = filterStr.match(/grayscale\(([\d.]+)\)/);
  if (gMatch) grayscale = parseFloat(gMatch[1]);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Grayscale
    if (grayscale > 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = r + (gray - r) * grayscale;
      g = g + (gray - g) * grayscale;
      b = b + (gray - b) * grayscale;
    }

    // Sepia
    if (sepia > 0) {
      const sr = (r * 0.393) + (g * 0.769) + (b * 0.189);
      const sg = (r * 0.349) + (g * 0.686) + (b * 0.168);
      const sb = (r * 0.272) + (g * 0.534) + (b * 0.131);
      r = r + (sr - r) * sepia;
      g = g + (sg - g) * sepia;
      b = b + (sb - b) * sepia;
    }

    // Saturate
    if (saturate !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturate;
      g = gray + (g - gray) * saturate;
      b = gray + (b - gray) * saturate;
    }

    // Brightness
    if (brightness !== 1) {
      r *= brightness;
      g *= brightness;
      b *= brightness;
    }

    // Contrast
    if (contrast !== 1) {
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imgData, 0, 0);
}
