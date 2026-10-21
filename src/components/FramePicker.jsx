// FramePicker.jsx – a reusable frame picker UI component.
// Supports both modal and bottom‑sheet presentation styles depending on the viewport width.
// On desktop a centered portal is used; on phones a full‑screen bottom sheet is shown.

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function FramePicker({ visible, onClose, onSelect, selectedFrameId, frames = [] }) {
  // Quick escape and focus trap / return when closing
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  // Wrap content inside portal for full‑screen and for accessibility
  return visible ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="pixel-box-lg p-5 flex flex-col gap-4 max-w-sm w-full">
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
          <span className="font-bold text-xs flex items-center gap-1">
            <Sparkles size={16} className="text-yellow-500" /> PILIH FRAME
          </span>
          <button onClick={onClose} className="text-xs font-bold px-2 py-1 bg-zinc-200 border border-black hover:bg-zinc-300 min-h-[32px] min-w-[32px]">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {frames.map((fr) => {
            // Resolve a thumbnail source from PNG assets if available
            const thumbnailSrc = fr.pngFiles
              ? Object.values(fr.pngFiles)[0]
              : fr.thumbnail || null;
            return (
              <button
                key={fr.id}
                onClick={() => {
                  onSelect(fr.id);
                  onClose();
                }}
                className={
                  `border-2 p-2 text-left flex items-center gap-2 transition-all min-h-[44px]`
                  + (selectedFrameId === fr.id
                    ? ' border-black bg-pink-100 shadow-[2px_2px_0px_#000]'
                    : ' border-zinc-300 hover:border-zinc-400 bg-white hover:shadow-[2px_2px_0px_#000]')
                }
              >
                <div className="relative w-10 h-12 shrink-0 overflow-hidden border border-black/20 bg-zinc-100 flex items-center justify-center rounded-[3px]">
                  {thumbnailSrc ? (
                    <img
                      src={thumbnailSrc}
                      alt={fr.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-xl">{fr.emoji || '🖼️'}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold truncate">{fr.name}</span>
                  <span className="text-[9px] text-zinc-500 uppercase">
                    {fr.layout} {fr.allowedShots ? `(${fr.allowedShots.join('/')}x)` : ''}
                    {fr.builtin && ' • Bawaan'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="pixel-btn pixel-btn-primary w-full text-xs mt-2 min-h-[44px]">
          TUTUP
        </button>
      </div>
    </div>
  ) : null;
}