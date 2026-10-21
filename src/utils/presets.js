// Frame, Theme, Layout and Sticker presets for Photo-Us

export const LAYOUTS = [
  { id: 'strip4', name: '4-Cut Strip', count: 4, desc: 'Classic vertical photostrip' },
  { id: 'grid4', name: '2x2 Grid', count: 4, desc: 'Quad square layout' },
  { id: 'single', name: 'Single Card', count: 1, desc: 'Cute solo polaroid' },
];

export const SHOTS_PER_STRIP_OPTIONS = [
  { count: 1, label: '1 SHOT', desc: 'Single snapshot' },
  { count: 2, label: '2 SHOTS', desc: '2-cut vertical strip' },
  { count: 3, label: '3 SHOTS', desc: '3-cut classic strip' },
  { count: 4, label: '4 SHOTS', desc: '4-cut photostrip' },
  { count: 6, label: '6 SHOTS', desc: '6-cut extended strip' },
];

export const THEMES = [
  {
    id: 'sweet-pink',
    name: 'Sweet Romance',
    bg: '#ffe4ec',
    frameBorder: '#ff4d79',
    textColor: '#e11d48',
    accent: '#ff85a2',
    dotColor: '#fecdd3',
    headerText: '♡ PHOTO-US ♡',
    subText: 'TOGETHER FOREVER',
    tag: 'ROMANTIC'
  },
  {
    id: 'retro-arcade',
    name: '8-Bit Arcade',
    bg: '#0f172a',
    frameBorder: '#06b6d4',
    textColor: '#facc15',
    accent: '#ec4899',
    dotColor: '#1e293b',
    headerText: '★ PLAYER 1 & 2 ★',
    subText: 'HIGH SCORE: 99999',
    tag: 'RETRO'
  },
  {
    id: 'kawaii-cat',
    name: 'Kawaii Kitty',
    bg: '#fef3c7',
    frameBorder: '#f59e0b',
    textColor: '#92400e',
    accent: '#fb7185',
    dotColor: '#fde68a',
    headerText: '(=^･ω･^=) NYA!',
    subText: 'MEOW WITH U ♡',
    tag: 'CUTE'
  },
  {
    id: 'y2k-cyber',
    name: 'Y2K Cyber Star',
    bg: '#ede9fe',
    frameBorder: '#8b5cf6',
    textColor: '#5b21b6',
    accent: '#06b6d4',
    dotColor: '#ddd6fe',
    headerText: '★ CYBER ANGEL ★',
    subText: 'BESTIES 4EVER',
    tag: 'Y2K'
  },
  {
    id: 'retro-95',
    name: '90s Windows OS',
    bg: '#cbd5e1',
    frameBorder: '#000080',
    textColor: '#0f172a',
    accent: '#0284c7',
    dotColor: '#94a3b8',
    headerText: '💾 PHOTO_US.EXE',
    subText: 'SAVED TO C:\\MEMORIES',
    tag: '90s OS'
  },
  {
    id: 'matcha-green',
    name: 'Matcha Latte',
    bg: '#ecfccb',
    frameBorder: '#65a30d',
    textColor: '#365314',
    accent: '#84cc16',
    dotColor: '#d9f99d',
    headerText: '🍵 COZY MOMENT',
    subText: 'SWEET & WARM',
    tag: 'COZY'
  },
  {
    id: 'dark-noir',
    name: 'Midnight Noir',
    bg: '#18181b',
    frameBorder: '#ffffff',
    textColor: '#ffffff',
    accent: '#a1a1aa',
    dotColor: '#27272a',
    headerText: '✦ NOIR STUDIO ✦',
    subText: 'TIMELESS MEMORY',
    tag: 'CLASSIC'
  }
];

export const FILTERS = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'vintage', name: 'Warm 90s', filter: 'sepia(0.35) contrast(1.1) saturate(1.2)' },
  { id: 'noir', name: 'B&W Film', filter: 'grayscale(1) contrast(1.25)' },
  { id: 'pastel', name: 'Pastel Dream', filter: 'brightness(1.1) saturate(0.9) contrast(0.95)' },
  { id: 'cyber', name: 'Cyberpunk', filter: 'hue-rotate(25deg) contrast(1.2) saturate(1.4)' }
];

export const STICKERS = [
  { id: 'heart', label: 'Pixel Heart', emoji: '❤️' },
  { id: 'sparkles', label: 'Sparkles', emoji: '✨' },
  { id: 'bow', label: 'Ribbon Bow', emoji: '🎀' },
  { id: 'sunglasses', label: 'Pixel Shades', emoji: '🕶️' },
  { id: 'cat', label: 'Kitty', emoji: '🐱' },
  { id: 'bunny', label: 'Bunny', emoji: '🐰' },
  { id: 'crown', label: 'Pixel Crown', emoji: '👑' },
  { id: 'cherries', label: 'Cherries', emoji: '🍒' },
  { id: 'wings', label: 'Wings', emoji: '🪽' },
  { id: 'camera', label: 'Camera', emoji: '📸' },
  { id: 'stars', label: 'Star', emoji: '⭐' },
  { id: 'love_bubble', label: 'LOVE', text: 'LOVE' },
  { id: 'bff_bubble', label: 'BFF', text: 'BFF' },
  { id: 'cute_bubble', label: 'CUTE', text: 'CUTIE' }
];

export const PALETTE_COLORS = [
  '#ffe4ec', '#fef3c7', '#ecfccb', '#ede9fe', '#e0f2fe', '#fce7f3', '#18181b', '#ffffff'
];
