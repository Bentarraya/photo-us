export const shotOptions = (frames) => [...new Set(frames.flatMap(f => f.allowedShots))].sort((a, b) => a - b);

export function pickFrame(frames, state, frameId) {
  const f = frames.find(x => x.id === frameId);
  if (!f) return { state, toast: null };
  if (f.allowedShots.includes(state.shots)) return { state: { ...state, frameId }, toast: null };
  return { state: { ...state, frameId, shots: f.defaultShots }, toast: f.name + " cuma mendukung " + f.allowedShots.join("/") + " foto, jumlah foto diubah ke " + f.defaultShots };
}

export function pickShots(frames, state, shots) {
  const cur = frames.find(x => x.id === state.frameId);
  if (cur && cur.allowedShots.includes(shots)) return { state: { ...state, shots }, toast: null };
  const next = frames.find(f => f.allowedShots.includes(shots));
  if (!next) return { state, toast: null };
  return { state: { ...state, frameId: next.id, shots }, toast: (cur ? cur.name : "Frame ini") + " tidak mendukung " + shots + " foto, ganti ke " + next.name };
}

export function randomize(frames, filters, state, rand = Math.random) {
  const compatible = frames.filter(f => f.allowedShots.includes(state.shots));
  const pool = compatible.length > 1 ? compatible.filter(f => f.id !== state.frameId) : compatible;
  if (!pool.length) return { state, filterId: state.filterId };
  const frame = pool[Math.floor(rand() * pool.length)];
  const filter = filters[Math.floor(rand() * filters.length)];
  return { state: { ...state, frameId: frame.id, filterId: filter.id }, toast: null };
}
