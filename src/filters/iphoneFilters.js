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
  uniform vec2 uUvScale;  // cover-fit scale applied inside the crop rect
  uniform vec2 uUvOffset; // cover-fit offset, keeps the centre
  void main() {
    vec2 uv = uUvOffset + aTexCoord * uUvScale;
    if (uUseCrop > 0.5) {
      vUv = uCrop.xy + uv * uCrop.zw;
    } else {
      vUv = uv;
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
  uniform mat3 uWhiteBalance;
  uniform float uClarityRadius; // unsharp radius in texels
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

  vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
  }

  vec3 linearToSrgb(vec3 c) {
    c = max(c, 0.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }

  // Soft shoulder above 0.9. Values that were already inside range are barely
  // touched, but the top of the range compresses instead of clipping flat.
  vec3 highlightShoulder(vec3 c) {
    const float k = 0.90;
    vec3 t = max(c - k, 0.0);
    return min(c, vec3(k)) + (1.0 - k) * (1.0 - exp(-t / (1.0 - k)));
  }

  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;

    // Exposure and white balance, done in linear light. The chromatic
    // adaptation matrix is built in JS from the preset's per-channel gain, so
    // warm/cool shifts behave like a light change instead of scaling each
    // encoded channel independently (which rotated hue on saturated colours).
    c = linearToSrgb(uWhiteBalance * srgbToLinear(c));
    // Exposure stays in the authored (encoded) space: the presets were tuned
    // there, and applying it in linear light made every look noticeably weaker.
    c *= exp2(uExposure);

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
      // Two-ring 9-tap disk. The taps have to reach far enough to be a real
      // local-contrast blur: a 3x3 at one texel was pure sharpening.
      vec3 centre = texture2D(uTex, vUv).rgb;
      if (uMono > 0.5) centre = vec3(dot(centre, uMonoMix));
      vec3 blur = centre;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853981634;
        float ring = mod(float(i), 2.0) < 0.5 ? 0.55 : 1.0;
        vec2 off = vec2(cos(a), sin(a)) * uClarityRadius * ring;
        vec3 s = texture2D(uTex, vUv + off * uTexel).rgb;
        // c is already monochrome in mono mode, so the blur must be too -
        // otherwise the unsharp mask subtracts a colour image from a grey one
        // and the "black & white" output comes back tinted.
        if (uMono > 0.5) s = vec3(dot(s, uMonoMix));
        blur += s;
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

    gl_FragColor = vec4(clamp(highlightShoulder(c), 0.0, 1.0), 1.0);
  }
`;

// ---------------------------------------------------------------------------
// White balance
//
// Presets store a per-channel gain tuned against sRGB-encoded values. Turning
// that into a Bradford chromatic-adaptation matrix and applying it in linear
// light stops saturated colours from rotating hue (the old per-channel
// multiply made "Vivid Warm" read like sepia rather than like warmer light).
// ---------------------------------------------------------------------------

const BRADFORD = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296]
];
const BRADFORD_INV = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867]
];

function mul3(a, b) {
  const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
    }
  }
  return out;
}

function apply3(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}

const whiteBalanceCache = new Map();

/** Row-major 3x3 chromatic adaptation matrix for a preset's gain triple. */
export function getWhiteBalanceMatrix(gain) {
  const key = gain.join(',');
  const cached = whiteBalanceCache.get(key);
  if (cached) return cached;

  // The gains were authored on sRGB values, so undo the transfer curve to get
  // the equivalent linear-light scaling.
  const linear = gain.map((g) => Math.pow(Math.max(g, 1e-3), 2.4));
  const whiteLms = apply3(BRADFORD, linear);
  const neutralLms = apply3(BRADFORD, [1, 1, 1]);
  const d = whiteLms.map((v, i) => v / neutralLms[i]);
  const D = [
    [d[0], 0, 0],
    [0, d[1], 0],
    [0, 0, d[2]]
  ];

  let m = mul3(mul3(BRADFORD_INV, D), BRADFORD);

  // Keep neutral luminance stable so a tint does not double as an exposure change.
  const w = apply3(m, [1, 1, 1]);
  const luma = 0.2126 * w[0] + 0.7152 * w[1] + 0.0722 * w[2];
  if (luma > 1e-6) m = m.map((row) => row.map((v) => v / luma));

  whiteBalanceCache.set(key, m);
  return m;
}

function toColumnMajor(m) {
  return new Float32Array([m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]]);
}

/** Unsharp radius in texels - roughly 1% of the short edge, clamped. */
export function clarityRadiusFor(width, height) {
  const shortEdge = Math.min(width, height);
  return Math.max(2, Math.min(24, Math.round(shortEdge * 0.01)));
}

/** Linear-light helpers used by the Canvas 2D fallback. */
const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  SRGB_TO_LINEAR[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  const x = Math.max(v, 0);
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** Separable box blur (O(pixels), independent of radius) for the 2D fallback. */
function boxBlurRGBA(src, w, h, radius) {
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);
  const win = radius * 2 + 1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let r = 0, g = 0, b = 0;
    for (let x = -radius; x <= radius; x++) {
      const i = (row + Math.min(w - 1, Math.max(0, x))) * 4;
      r += src[i]; g += src[i + 1]; b += src[i + 2];
    }
    for (let x = 0; x < w; x++) {
      const o = (row + x) * 4;
      tmp[o] = r / win; tmp[o + 1] = g / win; tmp[o + 2] = b / win; tmp[o + 3] = 255;
      const ai = (row + Math.min(w - 1, x + radius + 1)) * 4;
      const si = (row + Math.max(0, x - radius)) * 4;
      r += src[ai] - src[si];
      g += src[ai + 1] - src[si + 1];
      b += src[ai + 2] - src[si + 2];
    }
  }

  for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let y = -radius; y <= radius; y++) {
      const i = (Math.min(h - 1, Math.max(0, y)) * w + x) * 4;
      r += tmp[i]; g += tmp[i + 1]; b += tmp[i + 2];
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      dst[o] = r / win; dst[o + 1] = g / win; dst[o + 2] = b / win; dst[o + 3] = 255;
      const ai = (Math.min(h - 1, y + radius + 1) * w + x) * 4;
      const si = (Math.max(0, y - radius) * w + x) * 4;
      r += tmp[ai] - tmp[si];
      g += tmp[ai + 1] - tmp[si + 1];
      b += tmp[ai + 2] - tmp[si + 2];
    }
  }

  return dst;
}

function highlightShoulder(v) {
  const K = 0.9;
  if (v <= K) return v;
  return K + (1 - K) * (1 - Math.exp(-(v - K) / (1 - K)));
}

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
    uWhiteBalance: gl.getUniformLocation(program, 'uWhiteBalance'),
    uClarityRadius: gl.getUniformLocation(program, 'uClarityRadius'),
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
    uUseCrop: gl.getUniformLocation(program, 'uUseCrop'),
    uUvScale: gl.getUniformLocation(program, 'uUvScale'),
    uUvOffset: gl.getUniformLocation(program, 'uUvOffset')
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

  // Effective source size. Prefer intrinsic dimensions: `video.width` and
  // `img.width` reflect the HTML width attribute, not the decoded frame size,
  // so using them first makes the crop maths wrong by the attribute ratio.
  const sourceW =
    sourceImage.videoWidth || sourceImage.naturalWidth || sourceImage.width || w;
  const sourceH =
    sourceImage.videoHeight || sourceImage.naturalHeight || sourceImage.height || h;

  // Pass crop info as uniforms for shader-based cropping (preview mode only)
  if (!sourceIsPreCropped && crop && crop.sWidth && crop.sHeight) {
    // Normalized crop coordinates [0, 1]
    gl.uniform4f(
      uniforms.uCrop,
      crop.sx / sourceW,
      crop.sy / sourceH,
      crop.sWidth / sourceW,
      crop.sHeight / sourceH
    );
    gl.uniform1f(uniforms.uUseCrop, 1.0);
  } else {
    gl.uniform1f(uniforms.uUseCrop, 0.0);
  }

  // Cover-fit. The visible content is the crop rectangle (or the whole source
  // when there is no crop); if its aspect differs from the canvas we trim the
  // overflowing axis instead of squashing the frame.
  const contentW = (crop && crop.sWidth) || sourceW;
  const contentH = (crop && crop.sHeight) || sourceH;
  const contentAspect = contentW / contentH;
  const canvasAspect = w / h;
  let uvScaleX = 1;
  let uvScaleY = 1;
  if (contentAspect > canvasAspect) {
    uvScaleX = canvasAspect / contentAspect;
  } else if (contentAspect < canvasAspect) {
    uvScaleY = contentAspect / canvasAspect;
  }
  gl.uniform2f(uniforms.uUvScale, uvScaleX, uvScaleY);
  gl.uniform2f(uniforms.uUvOffset, (1 - uvScaleX) / 2, (1 - uvScaleY) / 2);

  gl.uniform1f(uniforms.uExposure, preset.exposure);
  gl.uniformMatrix3fv(uniforms.uWhiteBalance, false, toColumnMajor(getWhiteBalanceMatrix(preset.gain)));
  gl.uniform1f(uniforms.uClarityRadius, clarityRadiusFor(w, h));
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
  const wb = getWhiteBalanceMatrix(preset.gain);
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

  // For clarity we need a blurred version of the composited frame.
  let blurData = null;
  if (clarity > 0) {
    // Blur the already composited base image, not the raw source: the base was
    // drawn with cover-fit, so redrawing the source here with different
    // geometry made the unsharp mask subtract a misaligned image (ghosting).
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = width;
    blurCanvas.height = height;
    const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });
    blurCtx.drawImage(ctx.canvas, 0, 0, width, height);

    const radius = clarityRadiusFor(width, height);
    blurData = boxBlurRGBA(blurCtx.getImageData(0, 0, width, height).data, width, height, radius);

    // In mono mode the graded pixel is grey, so the blur must be grey too.
    // Keeping the colour here reintroduced a tint (Noir came out purple).
    if (isMono) {
      for (let i = 0; i < blurData.length; i += 4) {
        const l = blurData[i] * monoMixR + blurData[i + 1] * monoMixG + blurData[i + 2] * monoMixB;
        blurData[i] = l;
        blurData[i + 1] = l;
        blurData[i + 2] = l;
      }
    }
  }

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Exposure and white balance in linear light (same as the shader)
    const lr = SRGB_TO_LINEAR[Math.max(0, Math.min(255, data[i]))];
    const lg = SRGB_TO_LINEAR[Math.max(0, Math.min(255, data[i + 1]))];
    const lb = SRGB_TO_LINEAR[Math.max(0, Math.min(255, data[i + 2]))];
    r = linearToSrgb(wb[0][0] * lr + wb[0][1] * lg + wb[0][2] * lb) * exposureMult;
    g = linearToSrgb(wb[1][0] * lr + wb[1][1] * lg + wb[1][2] * lb) * exposureMult;
    b = linearToSrgb(wb[2][0] * lr + wb[2][1] * lg + wb[2][2] * lb) * exposureMult;

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

    // Highlight shoulder + clamp, then write back
    data[i] = Math.round(Math.max(0, Math.min(1, highlightShoulder(r))) * 255);
    data[i + 1] = Math.round(Math.max(0, Math.min(1, highlightShoulder(g))) * 255);
    data[i + 2] = Math.round(Math.max(0, Math.min(1, highlightShoulder(b))) * 255);
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

  // Render into throw-away canvases, never into `canvas` itself: a canvas that
  // owns a WebGL context can no longer hand back a 2D context, so grading the
  // target (or reusing the live preview canvas) throws "reading 'drawImage'".
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = w;
  sourceCanvas.height = h;
  const sourceCtx = sourceCanvas.getContext('2d');
  sourceCtx.drawImage(source, 0, 0, w, h);

  const gradedCanvas = document.createElement('canvas');
  gradedCanvas.width = w;
  gradedCanvas.height = h;
  if (!applyIphoneFilter(gradedCanvas, sourceCanvas, preset)) return false;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(gradedCanvas, 0, 0);
  return true;
}

export { IPHONE_FILTER_PRESETS, getAllIphoneFilters, getIphoneFilterById, IPHONE_FILTERS_ORDER } from './iphonePresets';