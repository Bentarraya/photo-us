import { FILTERS_REGISTRY, getFilterById } from './filters';
import { checkCanvasFilterSupport, applyCssFilterFallback } from './fallback';

export { FILTERS_REGISTRY, getFilterById };

/**
 * Executes the filter pipeline onto a target Canvas 2D context:
 * 1. Draw source video/image (with optional mirror flip)
 * 2. Apply CSS-style filter (using ctx.filter or fallback)
 * 3. Run per-pixel or draw-based `process`
 * 4. Run procedural `overlay`
 */
export function applyFilterPipeline({
  ctx,
  source,
  width,
  height,
  filterDef,
  isMirrored = false,
  timestamp = performance.now()
}) {
  const filter = filterDef || FILTERS_REGISTRY[0];
  const supportsFilter = checkCanvasFilterSupport();

  // 1. Clear target canvas
  ctx.clearRect(0, 0, width, height);

  // 2. Draw source (mirrored if selfie)
  ctx.save();
  if (isMirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  // Stage 1: CSS filter
  if (filter.cssFilter && filter.cssFilter !== 'none') {
    if (supportsFilter) {
      ctx.filter = filter.cssFilter;
      ctx.drawImage(source, 0, 0, width, height);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(source, 0, 0, width, height);
      ctx.restore(); // restore transform before fallback
      applyCssFilterFallback(ctx, width, height, filter.cssFilter);
      ctx.save();
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
    }
  } else {
    ctx.drawImage(source, 0, 0, width, height);
  }
  ctx.restore();

  // Stage 2: Custom process (channel split, pixelation, LUT, glitch, etc.)
  if (filter.process) {
    try {
      filter.process(ctx, width, height, timestamp);
    } catch (err) {
      console.warn('Filter process error:', err);
    }
  }

  // Stage 3: Overlay (vignette, scanlines, glitter stars, confetti, etc.)
  if (filter.overlay) {
    try {
      filter.overlay(ctx, width, height, timestamp);
    } catch (err) {
      console.warn('Filter overlay error:', err);
    }
  }
}
