#!/usr/bin/env node
// scripts/build-frames-index.mjs
// Scans public/frames/ for custom PNG frames and generates public/frames/index.json
// Run with: node scripts/build-frames-index.mjs
// Hooked into predev and prebuild via package.json

import fs from 'fs';
import path from 'path';

const FRAMES_DIR = path.resolve('public/frames');
const OUTPUT_FILE = path.resolve('public/frames/index.json');

function detectSlotsFromAlphaMask(imagePath) {
  // This would be implemented at runtime in the browser
  // For the build script, we just record the expected shot count from filename
  return null; // Runtime detection
}

function scanFramesDir() {
  if (!fs.existsSync(FRAMES_DIR)) {
    console.log('[frames:index] No frames directory found at', FRAMES_DIR);
    return [];
  }

  const entries = fs.readdirSync(FRAMES_DIR, { withFileTypes: true });
  const frames = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const frameDir = path.join(FRAMES_DIR, entry.name);

    // Look for PNG files named with shot counts: 1.png, 2.png, 3.png, etc.
    const pngFiles = fs.readdirSync(frameDir)
      .filter(f => f.endsWith('.png') && /^\d+\.png$/.test(f))
      .map(f => {
        const shots = parseInt(f.replace('.png', ''), 10);
        return { shots, file: `/frames/${entry.name}/${f}` };
      })
      .sort((a, b) => a.shots - b.shots);

    if (pngFiles.length === 0) {
      console.log(`[frames:index] ⚠ ${entry.name}: no PNG files found (expected 1.png, 2.png, 3.png...)`);
      continue;
    }

    // Read meta.json if exists
    let meta = { name: entry.name, defaultShots: pngFiles[0].shots, order: 99 };
    const metaPath = path.join(frameDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        // Merge with defaults, preserving slots and other custom properties
        meta = { ...meta, ...metaContent };
      } catch (e) {
        console.log(`[frames:index] ⚠ ${entry.name}: invalid meta.json:`, e.message);
      }
    }

    const allowedShots = pngFiles.map(f => f.shots);
    const defaultShots = meta.defaultShots || allowedShots[0];

    // Extract slots from meta if present
    const slots = meta.slots || {};

    frames.push({
      id: entry.name,
      name: meta.name || entry.name,
      order: meta.order || 99,
      type: 'image',
      allowedShots,
      defaultShots,
      pngFiles: Object.fromEntries(pngFiles.map(f => [f.shots, f.file])),
      // Underlay support (optional)
      underlay: fs.existsSync(path.join(frameDir, 'underlay.png')) ? `/frames/${entry.name}/underlay.png` :
                fs.existsSync(path.join(frameDir, 'underlay.jpg')) ? `/frames/${entry.name}/underlay.jpg` : null,
      // meta.json may override slot detection
      meta: {
        ...meta,
        slots // Ensure slots are in meta for runtime
      }
    });
  }

  // Sort by order
  frames.sort((a, b) => (a.order || 99) - (b.order || 99));
  return frames;
}

function main() {
  console.log('[frames:index] Scanning', FRAMES_DIR);
  const frames = scanFramesDir();

  if (frames.length === 0) {
    console.log('[frames:index] No custom frames found. App will use built-in frames only.');
  } else {
    console.log('[frames:index] Found', frames.length, 'custom frame(s):');
    frames.forEach(f => console.log(`  - ${f.name} (${f.id}): shots ${f.allowedShots.join(', ')}, default ${f.defaultShots}`));
  }

  // Write index.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(frames, null, 2));
  console.log('[frames:index] Written to', OUTPUT_FILE);
}

main();