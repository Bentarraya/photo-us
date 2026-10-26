// iPhone Camera-style Filter Presets
// Based on Apple's iOS Camera filters: Vivid, Dramatic, Mono, Silvertone, Noir
// Characteristics per the brief - these are approximations of the look

export const IPHONE_FILTER_PRESETS = {
  // Original - no processing
  original: {
    id: 'original',
    name: 'Original',
    emoji: '📷',
    exposure: 0,
    gain: [1, 1, 1],
    black: 0,
    white: 1,
    gamma: 1,
    contrast: 0,
    sat: 1,
    vibrance: 0,
    clarity: 0,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Vivid: brighter, punchy, boosted saturation and contrast; clean whites
  vivid: {
    id: 'vivid',
    name: 'Vivid',
    emoji: '✨',
    exposure: 0.05,
    gain: [1, 1, 1],
    black: 0,
    white: 1,
    gamma: 0.97,
    contrast: 0.20,
    sat: 1.25,
    vibrance: 0.30,
    clarity: 0.12,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Vivid Warm: same grade with warm (yellow-orange) white-balance shift
  'vivid-warm': {
    id: 'vivid-warm',
    name: 'Vivid Warm',
    emoji: '🌅',
    exposure: 0.05,
    gain: [1.035, 1.00, 0.965],
    black: 0,
    white: 1,
    gamma: 0.97,
    contrast: 0.20,
    sat: 1.22,
    vibrance: 0.28,
    clarity: 0.12,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Vivid Cool: same grade with cool (blue) white-balance shift
  'vivid-cool': {
    id: 'vivid-cool',
    name: 'Vivid Cool',
    emoji: '❄️',
    exposure: 0.05,
    gain: [0.965, 1.00, 1.035],
    black: 0,
    white: 1,
    gamma: 0.97,
    contrast: 0.20,
    sat: 1.22,
    vibrance: 0.28,
    clarity: 0.12,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Dramatic: moody, darker with deep blacks, strong contrast, lower saturation, strong local contrast (clarity)
  dramatic: {
    id: 'dramatic',
    name: 'Dramatic',
    emoji: '🎭',
    exposure: -0.12,
    gain: [1, 1, 1],
    black: 0.03,
    white: 0.98,
    gamma: 1.08,
    contrast: 0.38,
    sat: 0.80,
    vibrance: 0,
    clarity: 0.45,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Dramatic Warm: dramatic with warm tint
  'dramatic-warm': {
    id: 'dramatic-warm',
    name: 'Dramatic Warm',
    emoji: '🌆',
    exposure: -0.12,
    gain: [1.03, 1.00, 0.97],
    black: 0.03,
    white: 0.98,
    gamma: 1.08,
    contrast: 0.38,
    sat: 0.80,
    vibrance: 0,
    clarity: 0.45,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Dramatic Cool: dramatic with cool tint
  'dramatic-cool': {
    id: 'dramatic-cool',
    name: 'Dramatic Cool',
    emoji: '🌑',
    exposure: -0.12,
    gain: [0.97, 1.00, 1.03],
    black: 0.03,
    white: 0.98,
    gamma: 1.08,
    contrast: 0.38,
    sat: 0.80,
    vibrance: 0,
    clarity: 0.45,
    mono: false,
    monoMix: [0.2126, 0.7152, 0.0722],
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Mono: neutral black and white, moderate contrast
  mono: {
    id: 'mono',
    name: 'Mono',
    emoji: '⚫',
    exposure: 0,
    gain: [1, 1, 1],
    black: 0.01,
    white: 1,
    gamma: 1.00,
    contrast: 0.15,
    sat: 0,
    vibrance: 0,
    clarity: 0.10,
    mono: true,
    monoMix: [0.30, 0.59, 0.11], // Red-weighted for clean skin tones
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  },

  // Silvertone: brighter, softer black and white, lifted blacks, faint cool/silver tint
  silvertone: {
    id: 'silvertone',
    name: 'Silvertone',
    emoji: '🌫️',
    exposure: 0.10,
    gain: [1, 1, 1],
    black: 0.05,
    white: 1,
    gamma: 0.95,
    contrast: 0.08,
    sat: 0,
    vibrance: 0,
    clarity: 0.12,
    mono: true,
    monoMix: [0.28, 0.60, 0.12],
    tintAmt: 0.35,
    shadowTint: [0.94, 0.98, 1.06], // Cool shadows
    highTint: [0.99, 1.00, 1.03]   // Slightly warm highlights
  },

  // Noir: high-contrast, dark black and white with crushed blacks and punchy look
  noir: {
    id: 'noir',
    name: 'Noir',
    emoji: '🌚',
    exposure: -0.15,
    gain: [1, 1, 1],
    black: 0.06,
    white: 0.97,
    gamma: 1.12,
    contrast: 0.60,
    sat: 0,
    vibrance: 0,
    clarity: 0.45,
    mono: true,
    monoMix: [0.38, 0.50, 0.12], // Red-weighted for clean bright skin
    tintAmt: 0,
    shadowTint: [1, 1, 1],
    highTint: [1, 1, 1]
  }
};

// Ordered list for UI
export const IPHONE_FILTERS_ORDER = [
  'original',
  'vivid',
  'vivid-warm',
  'vivid-cool',
  'dramatic',
  'dramatic-warm',
  'dramatic-cool',
  'mono',
  'silvertone',
  'noir'
];

export function getIphoneFilterById(id) {
  return IPHONE_FILTER_PRESETS[id] || IPHONE_FILTER_PRESETS.original;
}

export function getAllIphoneFilters() {
  return IPHONE_FILTERS_ORDER.map(id => IPHONE_FILTER_PRESETS[id]);
}