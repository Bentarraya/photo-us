// iPhone Camera-style Filter Pipeline
// WebGL fragment shader implementation with Canvas 2D fallback
// Single parametric color grader for live preview, thumbnails, capture, upload, and export

import { IPHONE_FILTER_PRESETS, getAllIphoneFilters, getIphoneFilterById } from './iphonePresets';

// Per-canvas WebGL state. Keeping one context per canvas lets the live
// preview and a separate high-resolution capture canvas render at the same
// time, and prevents a remounted <canvas> from reusing a dead context.
const glStates = new WeakMap();

// Vertex shader - pass-through with UV coordinates, supports crop via uCrop
const VERTEX_SHADER_SOURCE = `
  attribute vec2 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vUv;
  uniform float uUseCrop;
  uniform vec4 uCrop; // x, y, width, height in normalized [0,1] coordinates
  void main() {
    if (uUseCrop > 0.5) {
      vUv = uCrop.xy + aTexCoord * uCrop.zw;
    } else {
      vUv = aTexCoord;
    }
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// Fragment shader - parametric color grader based on the brief's reference GLSL
const FRAGMENT_SHADER_SOURCE = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform sampler2D uTex;
  uniform vec2 uTexel;
  varying vec2 vUv;

  // Grading uniforms
  uniform float uExposure;
  uniform vec3 uGain;
  uniform float uBlack;
  uniform float uWhite;
  uniform float uGamma;
  uniform float uContrast;
  uniform float uSat;
  uniform float uVibrance;
  uniform float uClarity;
  uniform float uMono;
  uniform vec3 uMonoMix;
  uniform float uTintAmt;
  uniform vec3 uShadowTint;
  uniform vec3 uHighTint;

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  vec3 scurve(vec3 x, float a) {
    vec3 s = x * x * (3.0 - 2.0 * x);
    return mix(x, s, a);
  }

  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;

    // Exposure and white balance
    c *= exp2(uExposure) * uGain;

    // Mono conversion
    if (uMono > 0.5) {
      c = vec3(dot(c, uMonoMix));
    }

    // Levels (black/white point)
    c = clamp((c - uBlack) / max(uWhite - uBlack, 0.001), 0.0, 1.0);

    // Gamma
    c = pow(c, vec3(uGamma));

    // Contrast S-curve
    c = scurve(c, uContrast);

    // Saturation & Vibrance (only for color)
    if (uMono < 0.5) {
      float l = dot(c, LUMA);
      float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
      c = mix(vec3(l), c, uSat * (1.0 + uVibrance * (1.0 - sat)));
    }

    // Clarity: unsharp mask with large radius, weighted toward midtones
    // Skip entirely when clarity is zero to avoid unnecessary texture samples
    if (uClarity > 0.0) {
      vec3 blur = vec3(0.0);
      float r = 6.0 * uTexel.x * 200.0; // Scale radius with resolution (~0.5-0.8% of image width)
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          blur += texture2D(uTex, vUv + vec2(float(i), float(j)) * uTexel * r).rgb;
        }
      }
      blur /= 9.0;
      float m = 1.0 - abs(2.0 * dot(c, LUMA) - 1.0);
      c += (c - blur) * uClarity * m;
    }

    // Mono tint (split toning)
    if (uMono > 0.5 && uTintAmt > 0.0) {
      float l = dot(c, LUMA);
      vec3 t = mix(uShadowTint, uHighTint, l);
      c = mix(vec3(l), vec3(l) * t, uTintAmt);
    }

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

/**
 * Initialize WebGL context and compile shader program
 */
function initWebGL(canvas) {
  if (glStates.has(canvas)) {
    const existing = glStates.get(canvas);
    return existing ? existing.gl : null;
  }

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true
  }) || canvas.getContext('experimental-webgl', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true
  });

  if (!gl) {
    console.warn('[iphone-filters] WebGL not available, using Canvas 2D fallback');
    glStates.set(canvas, null); // remember so we don't retry every frame
    return null;
  }

  // Compile shaders
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

  if (!vs || !fs) {
    console.warn('[iphone-filters] Shader compilation failed, using fallback');
    glStates.set(canvas, null);
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[iphone-filters] Program link failed:', gl.getProgramInfoLog(program));
    glStates.set(canvas, null);
    return null;
  }

  gl.useProgram(program);

  // Cache uniform locations
  const uniforms = {
    uTex: gl.getUniformLocation(program, 'uTex'),
    uTexel: gl.getUniformLocation(program, 'uTexel'),
    uExposure: gl.getUniformLocation(program, 'uExposure'),
    uGain: gl.getUniformLocation(program, 'uGain'),
    uBlack: gl.getUniformLocation(program, 'uBlack'),
    uWhite: gl.getUniformLocation(program, 'uWhite'),
    uGamma: gl.getUniformLocation(program, 'uGamma'),
    uContrast: gl.getUniformLocation(program, 'uContrast'),
    uSat: gl.getUniformLocation(program, 'uSat'),
    uVibrance: gl.getUniformLocation(program, 'uVibrance'),
    uClarity: gl.getUniformLocation(program, 'uClarity'),
    uMono: gl.getUniformLocation(program, 'uMono'),
    uMonoMix: gl.getUniformLocation(program, 'uMonoMix'),
    uTintAmt: gl.getUniformLocation(program, 'uTintAmt'),
    uShadowTint: gl.getUniformLocation(program, 'uShadowTint'),
    uHighTint: gl.getUniformLocation(program, 'uHighTint'),
    uCrop: gl.getUniformLocation(program, 'uCrop'),
    uUseCrop: gl.getUniformLocation(program, 'uUseCrop')
  };

  // Set up full-screen quad
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const texBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, 'aPosition');
  const texLoc = gl.getAttribLocation(program, 'aTexCoord');

  gl.enableVertexAttribArray(posLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(texLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

  const state = {
    gl,
    program,
    uniforms,
    texture: null,
    size: { w: 0, h: 0 }
  };
  glStates.set(canvas, state);

  // Handle context loss
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('[iphone-filters] WebGL context lost, falling back to Canvas 2D');
    glStates.delete(canvas);
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    console.log('[iphone-filters] WebGL context restored');
    initWebGL(canvas);
  }, false);

  return gl;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[iphone-filters] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Apply iPhone filter using WebGL
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} sourceImage - Source image/video
 * @param {Object} preset - Filter preset
 * @param {Object} [crop] - Optional source crop { sx, sy, sWidth, sHeight, isPreview }
 */
export function applyIphoneFilterWebGL(canvas, sourceImage, preset, crop = null) {
  if (!glStates.has(canvas)) {
    if (!initWebGL(canvas)) return false;
  }

  const state = glStates.get(canvas);
  if (!state) return false;

  const { gl, program, uniforms } = state;

  // Check canvas size and recreate texture if needed
  const w = canvas.width;
  const h = canvas.height;
  if (!state.texture || w !== state.size.w || h !== state.size.h) {
    if (state.texture) gl.deleteTexture(state.texture);
    state.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, state.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    state.size = { w, h };
  }

  // Upload source image to texture - use video directly when possible (no temp canvas)
  gl.bindTexture(gl.TEXTURE_2D, state.texture);
  const sourceIsPreCropped = !!(crop && crop.sWidth && crop.sHeight && !crop.isPreview);
  if (sourceIsPreCropped) {
    // Only create temp canvas for non-preview (capture) where we upload the
    // exact crop. The texture itself is already cropped, so the shader must
    // not crop it a second time.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = crop.sWidth;
    tempCanvas.height = crop.sHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(sourceImage, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, crop.sWidth, crop.sHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
  } else {
    // For preview: upload full video/image, handle crop via texture coordinates in shader
    // This avoids creating a temp canvas every frame
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImage);
  }

  // Viewport
  gl.viewport(0, 0, w, h);

  // Use program
  gl.useProgram(program);

  // Set uniforms
  gl.uniform1i(uniforms.uTex, 0);
  gl.uniform2f(uniforms.uTexel, 1 / w, 1 / h);

  // Pass crop info as uniforms for shader-based cropping (preview mode only)
  if (!sourceIsPreCropped && crop && crop.sWidth && crop.sHeight) {
    const sourceW = sourceImage.width || sourceImage.videoWidth;
    const sourceH = sourceImage.height || sourceImage.videoHeight;
    // Normalized crop coordinates [0, 1]
    gl.uniform4f(
      uniforms.uCrop || gl.getUniformLocation(program, 'uCrop'),
      crop.sx / sourceW,
      crop.sy / sourceH,
      crop.sWidth / sourceW,
      crop.sHeight / sourceH
    );
    gl.uniform1f(uniforms.uUseCrop || gl.getUniformLocation(program, 'uUseCrop'), 1.0);
  } else {
    gl.uniform1f(uniforms.uUseCrop || gl.getUniformLocation(program, 'uUseCrop'), 0.0);
  }

  gl.uniform1f(uniforms.uExposure, preset.exposure);
  gl.uniform3fv(uniforms.uGain, preset.gain);
  gl.uniform1f(uniforms.uBlack, preset.black);
  gl.uniform1f(uniforms.uWhite, preset.white);
  gl.uniform1f(uniforms.uGamma, preset.gamma);
  gl.uniform1f(uniforms.uContrast, preset.contrast);
  gl.uniform1f(uniforms.uSat, preset.sat);
  gl.uniform1f(uniforms.uVibrance, preset.vibrance);
  gl.uniform1f(uniforms.uClarity, preset.clarity);
  gl.uniform1f(uniforms.uMono, preset.mono ? 1.0 : 0.0);
  gl.uniform3fv(uniforms.uMonoMix, preset.monoMix);
  gl.uniform1f(uniforms.uTintAmt, preset.tintAmt);
  gl.uniform3fv(uniforms.uShadowTint, preset.shadowTint);
  gl.uniform3fv(uniforms.uHighTint, preset.highTint);

  // Draw
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return true;
}

/**
 * Canvas 2D fallback - applies the same grading math in JavaScript
 * This is slower but works when WebGL is unavailable
 * @param {CanvasRenderingContext2D} ctx - Target canvas context
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} sourceImage - Source image/video
 * @param {Object} preset - Filter preset
 * @param {number} width - Target canvas width
 * @param {number} height - Target canvas height
 * @param {Object} [crop] - Optional source crop { sx, sy, sWidth, sHeight }
 */
export function applyIphoneFilterCanvas2D(ctx, sourceImage, preset, width, height, crop = null) {
  // Create a temporary canvas for the source (with optional crop)
  const tempCanvas = document.createElement('canvas');
  let sourceW = sourceImage.width || sourceImage.videoWidth;
  let sourceH = sourceImage.height || sourceImage.videoHeight;

  if (crop) {
    tempCanvas.width = crop.sWidth;
    tempCanvas.height = crop.sHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(sourceImage, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, crop.sWidth, crop.sHeight);
    sourceW = crop.sWidth;
    sourceH = crop.sHeight;
  } else {
    tempCanvas.width = sourceW;
    tempCanvas.height = sourceH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(sourceImage, 0, 0, sourceW, sourceH);
  }

  // Draw to target canvas (cover-fit to fill)
  const scale = Math.max(width / sourceW, height / sourceH);
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;
  ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);

  // Get image data for pixel manipulation
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Precompute values
  const exposureMult = Math.pow(2, preset.exposure);
  const gainR = preset.gain[0];
  const gainG = preset.gain[1];
  const gainB = preset.gain[2];
  const black = preset.black;
  const white = preset.white;
  const gamma = preset.gamma;
  const contrast = preset.contrast;
  const sat = preset.sat;
  const vibrance = preset.vibrance;
  const clarity = preset.clarity;
  const isMono = preset.mono;
  const monoMixR = preset.monoMix[0];
  const monoMixG = preset.monoMix[1];
  const monoMixB = preset.monoMix[2];
  const tintAmt = preset.tintAmt;
  const shadowTintR = preset.shadowTint[0];
  const shadowTintG = preset.shadowTint[1];
  const shadowTintB = preset.shadowTint[2];
  const highTintR = preset.highTint[0];
  const highTintG = preset.highTint[1];
  const highTintB = preset.highTint[2];

  // S-curve function
  const scurve = (x, a) => {
    const s = x * x * (3 - 2 * x);
    return x + (s - x) * a;
  };

  // For clarity, we need a blurred version - do a simple box blur
  let blurData = null;
  if (clarity > 0) {
    // Create a temporary canvas for blur
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (crop) {
      tempCtx.drawImage(sourceImage, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, width, height);
    } else {
      tempCtx.drawImage(sourceImage, 0, 0, width, height);
    }
    // Simple 3x3 box blur (approximation)
    const tempData = tempCtx.getImageData(0, 0, width, height).data;
    blurData = new Uint8ClampedArray(tempData.length);
    const radius = Math.max(1, Math.round(Math.min(width, height) * 0.006)); // ~0.6% of min dimension

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const idx = (ny * width + nx) * 4;
            r += tempData[idx];
            g += tempData[idx + 1];
            b += tempData[idx + 2];
            count++;
          }
        }
        const idx = (y * width + x) * 4;
        blurData[idx] = r / count;
        blurData[idx + 1] = g / count;
        blurData[idx + 2] = b / count;
        blurData[idx + 3] = 255;
      }
    }
  }

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Exposure and white balance
    r *= exposureMult * gainR;
    g *= exposureMult * gainG;
    b *= exposureMult * gainB;

    // Mono conversion
    if (isMono) {
      const l = r * monoMixR + g * monoMixG + b * monoMixB;
      r = g = b = l;
    }

    // Levels (black/white point)
    const denom = Math.max(white - black, 0.001);
    r = Math.max(0, Math.min(1, (r - black) / denom));
    g = Math.max(0, Math.min(1, (g - black) / denom));
    b = Math.max(0, Math.min(1, (b - black) / denom));

    // Gamma
    r = Math.pow(r, gamma);
    g = Math.pow(g, gamma);
    b = Math.pow(b, gamma);

    // Contrast S-curve
    r = scurve(r, contrast);
    g = scurve(g, contrast);
    b = scurve(b, contrast);

    // Saturation & Vibrance
    if (!isMono) {
      const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const satVal = Math.max(r, g, b) - Math.min(r, g, b);
      const satFactor = sat * (1 + vibrance * (1 - satVal));
      r = l + (r - l) * satFactor;
      g = l + (g - l) * satFactor;
      b = l + (b - l) * satFactor;
    }

    // Clarity (unsharp mask)
    if (clarity > 0 && blurData) {
      const br = blurData[i] / 255;
      const bg = blurData[i + 1] / 255;
      const bb = blurData[i + 2] / 255;
      const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const m = 1 - Math.abs(2 * l - 1);
      r += (r - br) * clarity * m;
      g += (g - bg) * clarity * m;
      b += (b - bb) * clarity * m;
    }

    // Mono tint (split toning)
    if (isMono && tintAmt > 0) {
      const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const tr = l + (shadowTintR - 1) * (1 - l) + (highTintR - 1) * l;
      const tg = l + (shadowTintG - 1) * (1 - l) + (highTintG - 1) * l;
      const tb = l + (shadowTintB - 1) * (1 - l) + (highTintB - 1) * l;
      r = l + (tr - l) * tintAmt;
      g = l + (tg - l) * tintAmt;
      b = l + (tb - l) * tintAmt;
    }

    // Clamp and write back
    data[i] = Math.round(Math.max(0, Math.min(1, r)) * 255);
    data[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
    data[i + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
  }

  // Put processed image data back
  ctx.putImageData(imageData, 0, 0);
  return true;
}

/**
 * Main entry point - applies filter using WebGL if available, otherwise Canvas 2D
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} source - Source image/video
 * @param {string|Object} filterIdOrPreset - Filter ID string or preset object
 * @param {Object} [crop] - Optional source crop { sx, sy, sWidth, sHeight }
 * @returns {boolean} Success
 */
export function applyIphoneFilter(canvas, source, filterIdOrPreset, crop = null) {
  const preset = typeof filterIdOrPreset === 'string'
    ? getIphoneFilterById(filterIdOrPreset)
    : filterIdOrPreset;

  const w = canvas.width;
  const h = canvas.height;

  // Try WebGL first
  if (applyIphoneFilterWebGL(canvas, source, preset, crop)) {
    return true;
  }

  // Fallback to Canvas 2D
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[iphone-filters] No usable 2D context for fallback');
    return false;
  }
  return applyIphoneFilterCanvas2D(ctx, source, preset, w, h, crop);
}

/**
 * Generate a thumbnail for a filter (for the filter chip UI)
 * Uses low-res for performance
 */
export function generateFilterThumbnail(canvas, source, filterId) {
  const preset = getIphoneFilterById(filterId);
  const w = Math.min(160, canvas.width);
  const h = Math.min(160, canvas.height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(source, 0, 0, w, h);

  applyIphoneFilter(tempCanvas, tempCanvas, preset);

  // Draw thumbnail to target canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(tempCanvas, 0, 0);
  return true;
}

export { IPHONE_FILTER_PRESETS, getAllIphoneFilters, getIphoneFilterById, IPHONE_FILTERS_ORDER } from './iphonePresets';