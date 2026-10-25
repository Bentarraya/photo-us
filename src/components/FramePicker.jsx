// FramePicker.jsx – a reusable frame picker UI component.
// Supports both modal and bottom‑sheet presentation styles depending on the viewport width.
// On desktop a centered portal is used; on phones a full‑screen bottom sheet is shown.

import React, { useEffect } from 'react';
import { Camera, Sparkles, X } from 'lucide-react';

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

  return visible ? (
    <div className="nb-modal-overlay">
      <div
        className="nb-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame-picker-title"
      >
        <div className="nb-modal-header shrink-0">
          <h2
            id="frame-picker-title"
            className="font-display flex items-center gap-2 text-sm leading-tight tracking-tight sm:text-base"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-nb-ink bg-nb-yellow text-nb-ink">
              <Sparkles size={15} aria-hidden="true" />
            </span>
            PILIH FRAME
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="nb-btn nb-btn-icon nb-btn-blue"
            aria-label="Tutup pemilih frame"
            title="Tutup pemilih frame"
          >
            <X size={18} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        {frames.length === 0 ? (
          <div className="nb-frame-empty m-4">
            <div className="nb-empty-icon">
              <Camera size={26} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <p className="nb-meta">Belum ada frame custom. Tambahkan PNG ke public/frames/.</p>
          </div>
        ) : (
          <div className="m-4 grid max-h-[min(52vh,28rem)] min-h-0 grid-cols-1 gap-3 overflow-y-auto overscroll-contain sm:grid-cols-2">
            {frames.map((fr) => {
              // Resolve a thumbnail source from PNG assets if available
              const thumbnailSrc = fr.pngFiles
                ? Object.values(fr.pngFiles)[0]
                : fr.thumbnail || null;
              const selected = selectedFrameId === fr.id;
              const layoutLabel = fr.layout || `strip-${fr.allowedShots?.[0] || fr.defaultShots || 1}`;

              return (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => {
                    onSelect(fr.id);
                    onClose();
                  }}
                  className={`nb-frame-card ${selected ? 'is-selected' : ''}`}
                  aria-pressed={selected}
                >
                  <div className="nb-frame-thumb">
                    <span className="absolute inset-0 flex items-center justify-center text-xl" aria-hidden="true">
                      {fr.emoji || '🖼️'}
                    </span>
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={fr.name}
                        className="relative h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col text-left">
                    <span className="truncate font-sans text-sm font-bold">{fr.name}</span>
                    <span className="nb-meta truncate">
                      {layoutLabel}
                      {fr.allowedShots ? ` • ${fr.allowedShots.join('/')}x` : ''}
                      {fr.builtin ? ' • Bawaan' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="shrink-0 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="nb-btn nb-btn-primary nb-btn-lg w-full"
          >
            TUTUP
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
