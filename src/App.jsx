import React, { useState, useEffect, useCallback } from 'react';
import CameraView from './components/CameraView';
import StudioView from './components/StudioView';
import { FILTERS_REGISTRY } from './filters';
import { getAllFrames, getFrameById, getFramesForShots, getCustomFramesForShots } from './frames';
import { Camera, Heart, HelpCircle, Dice5, Sparkles, X } from 'lucide-react';
import { playClickSound } from './utils/sound';

export default function App() {
  const [currentMode, setCurrentMode] = useState('camera'); // 'camera' | 'studio'
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFramePickerModal, setShowFramePickerModal] = useState(false);

  // Frame states - load asynchronously
  const [allFrames, setAllFrames] = useState([]);
  const [framesLoaded, setFramesLoaded] = useState(false);

  // Filter state with localStorage
  const [selectedFilterId, setSelectedFilterId] = useState(() => {
    try {
      return localStorage.getItem('photobooth_filter_id') || FILTERS_REGISTRY[0].id;
    } catch {
      return FILTERS_REGISTRY[0].id;
    }
  });

  // Frame state with localStorage
  const [selectedFrameId, setSelectedFrameId] = useState(() => {
    try {
      return localStorage.getItem('photobooth_frame_id') || 'dark-blue';
    } catch {
      return 'dark-blue';
    }
  });

  // Shots per strip state with localStorage
  const [shotsPerStrip, setShotsPerStrip] = useState(() => {
    try {
      const saved = localStorage.getItem('photobooth_shots_per_strip');
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  // Load frames on mount
  useEffect(() => {
    async function loadFrames() {
      const frames = await getAllFrames();
      setAllFrames(frames);
      setFramesLoaded(true);

      // Validate stored frame/shots combination
      const savedFrameId = localStorage.getItem('photobooth_frame_id');
      const savedShots = localStorage.getItem('photobooth_shots_per_strip');

      if (savedFrameId && frames.find(f => f.id === savedFrameId)) {
        setSelectedFrameId(savedFrameId);
        const frame = frames.find(f => f.id === savedFrameId);
        if (frame && savedShots && frame.allowedShots?.includes(parseInt(savedShots, 10))) {
          setShotsPerStrip(parseInt(savedShots, 10));
        } else if (frame) {
          setShotsPerStrip(frame.defaultShots || 1);
        }
      } else if (frames.length > 0) {
        // Default to first custom frame
        setSelectedFrameId(frames[0].id);
        setShotsPerStrip(frames[0].defaultShots || 1);
      }
    }
    loadFrames();
  }, []);

  // Close the guide with Escape while it is open.
  useEffect(() => {
    if (!showInfoModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowInfoModal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInfoModal]);

  // Persist filter selection
  const handleSelectFilter = useCallback((id) => {
    setSelectedFilterId(id);
    try {
      localStorage.setItem('photobooth_filter_id', id);
    } catch {}
  }, []);

  // Persist frame selection and auto-switch to defaultShots
  const handleSelectFrame = useCallback(async (id) => {
    setSelectedFrameId(id);
    try {
      localStorage.setItem('photobooth_frame_id', id);
    } catch {}

    const frame = await getFrameById(id);
    if (frame) {
      const nextShots = frame.defaultShots || (frame.allowedShots ? frame.allowedShots[0] : 4);
      setShotsPerStrip(nextShots);
      try {
        localStorage.setItem('photobooth_shots_per_strip', String(nextShots));
      } catch {}
    }
  }, []);

  const handleSelectShotsPerStrip = useCallback((shots) => {
    setShotsPerStrip(shots);
    try {
      localStorage.setItem('photobooth_shots_per_strip', String(shots));
    } catch {}
  }, []);

  // Global "Surprise Me 🎲" randomizer - respects allowedShots
  const handleSurpriseAll = useCallback(async () => {
    playClickSound();

    // 1. Pick random filter
    const randomFilter = FILTERS_REGISTRY[Math.floor(Math.random() * FILTERS_REGISTRY.length)];
    handleSelectFilter(randomFilter.id);

    // 2. Get compatible frames for current shots
    const compatibleFrames = await getFramesForShots(shotsPerStrip);
    const customCompatibleFrames = await getCustomFramesForShots(shotsPerStrip);

    // Prefer custom frames for ACAK when available
    const pool = customCompatibleFrames.length > 0
      ? customCompatibleFrames.filter(f => f.id !== selectedFrameId)
      : compatibleFrames.filter(f => f.id !== selectedFrameId);

    // If only one compatible frame (current), allow it
    const candidates = pool.length > 0 ? pool : compatibleFrames;

    if (candidates.length > 0) {
      const randomFrame = candidates[Math.floor(Math.random() * candidates.length)];
      handleSelectFrame(randomFrame.id);
    }
  }, [shotsPerStrip, selectedFrameId, handleSelectFilter, handleSelectFrame]);

  // When camera session finishes
  const handlePhotosCaptured = useCallback((photos) => {
    setCapturedPhotos(photos);
    setRetakeSlot(null);
    setCurrentMode('studio');
  }, []);

  // Track which slot to retake (for single-slot retake)
  const [retakeSlot, setRetakeSlot] = useState(null);

  // Retake or new session
  const handleRetake = useCallback((slotIdx = -1) => {
    playClickSound();
    if (slotIdx === -1) {
      // Retake all - go back to camera mode
      setCapturedPhotos([]);
      setRetakeSlot(null);
      setCurrentMode('camera');
    } else if (slotIdx >= 0) {
      // Retake/fill a single slot: keep every other photo and let CameraView
      // capture only this slot.
      setCapturedPhotos(prev => {
        const next = new Array(Math.max(prev.length, shotsPerStrip)).fill(null);
        prev.forEach((photo, idx) => {
          if (idx < next.length) next[idx] = photo;
        });
        return next;
      });
      setRetakeSlot(slotIdx);
      setCurrentMode('camera');
    }
  }, [shotsPerStrip]);

  // Fill specific slots directly from the studio (upload, no camera needed)
  const handleFillSlots = useCallback((entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    setCapturedPhotos(prev => {
      const next = new Array(Math.max(prev.length, shotsPerStrip)).fill(null);
      prev.forEach((photo, idx) => {
        if (idx < next.length) next[idx] = photo;
      });
      entries.forEach(({ index, dataUrl }) => {
        if (index >= 0 && index < next.length && dataUrl) next[index] = dataUrl;
      });
      return next;
    });
  }, [shotsPerStrip]);

  // Compute current frame
  const currentFrame = allFrames.find(f => f.id === selectedFrameId) || allFrames[0];
  const layout = currentFrame ? {
    id: currentFrame.layout,
    name: currentFrame.name,
    count: shotsPerStrip,
    allowedShots: currentFrame.allowedShots || [1, 2, 3, 4, 6],
    defaultShots: currentFrame.defaultShots || 4
  } : { name: 'Loading...', count: shotsPerStrip, allowedShots: [1,2,3,4,6], defaultShots: 4 };

  // Don't render until frames are loaded
  if (!framesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="nb-card w-full max-w-sm p-6 text-center">
          <div className="nb-empty-icon mx-auto mb-4">
            <Camera size={28} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl tracking-tight">PHOTO-US</h1>
          <p className="nb-meta mt-1">Memuat frame...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="app-container">
        {/* Header */}
        <header className="nb-header nb-card p-3 sm:p-4 mb-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="nb-logo"
              aria-label="Kembali ke kamera"
              title="Kembali ke kamera"
              onClick={handleRetake}
            >
              <Camera size={22} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display flex items-center gap-1.5 text-base leading-none tracking-tight sm:text-xl">
                PHOTO-US <span className="text-nb-pink anim-heart">❤</span>
              </h1>
              <p className="nb-meta mt-1 hidden sm:block">
                NEO BRUTALIST PHOTOBOOTH • LIVE FILTERS & FRAMES
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleSurpriseAll}
              className="nb-btn nb-btn-yellow min-h-[44px] px-3 text-xs"
              title="Acak Filter & Frame (Surprise Me)"
              aria-label="Acak filter dan frame"
            >
              <Dice5 size={18} />
              <span className="hidden font-bold sm:inline">ACAK</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowInfoModal(true);
              }}
              className="nb-btn nb-btn-blue nb-btn-icon"
              title="Panduan"
              aria-label="Panduan"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Main Body: Camera or Studio */}
        <main className="flex-1 flex flex-col justify-center">
          {currentMode === 'camera' ? (
            <CameraView
              layout={layout}
              currentFrame={currentFrame}
              shotsPerStrip={shotsPerStrip}
              onSelectShotsPerStrip={handleSelectShotsPerStrip}
              onPhotosCaptured={handlePhotosCaptured}
              selectedFilterId={selectedFilterId}
              onSelectFilter={handleSelectFilter}
              selectedFrameId={selectedFrameId}
              onSelectFrame={handleSelectFrame}
              allFrames={allFrames}
              retakeSlot={retakeSlot}
              existingPhotos={capturedPhotos}
              onRetakeSlotHandled={() => setRetakeSlot(null)}
            />
          ) : (
            <StudioView
              photos={capturedPhotos}
              frames={allFrames}
              onRetake={handleRetake}
              onFillSlots={handleFillSlots}
              selectedFrameId={selectedFrameId}
              onSelectFrame={handleSelectFrame}
              shotsPerStrip={shotsPerStrip}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="nb-footer">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>[PHOTO-US v2.0]</span>
            <span aria-hidden="true">•</span>
            <span>{allFrames.length} FRAMES &amp; {FILTERS_REGISTRY.length} FILTERS</span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-1 text-nb-pink">
              MADE WITH <Heart size={10} className="fill-nb-pink" />
            </span>
          </div>
        </footer>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="nb-modal-overlay">
          <div
            className="nb-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
          >
            <div className="nb-modal-header">
              <h2
                id="info-modal-title"
                className="font-display flex items-center gap-2 text-xs leading-tight tracking-tight sm:text-sm md:text-base"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-nb-ink bg-nb-yellow text-nb-ink">
                  <Sparkles size={15} aria-hidden="true" />
                </span>
                CARA PAKAI PHOTO-US
              </h2>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="nb-btn nb-btn-blue nb-btn-icon"
                aria-label="Tutup panduan"
                title="Tutup panduan"
              >
                <X size={18} strokeWidth={3} aria-hidden="true" />
              </button>
            </div>

            <div className="nb-modal-body flex flex-col gap-2">
              <p className="nb-info-step text-sm leading-relaxed">📷 <b>1. Buka Kamera:</b> Tekan "Mulai Kamera" di iPhone, Android, atau PC.</p>
              <p className="nb-info-step text-sm leading-relaxed">✨ <b>2. Pilih Filter:</b> Pilih dari 10 filter live (Original, Vivid, Dramatic, Mono, dll).</p>
              <p className="nb-info-step text-sm leading-relaxed">⏱️ <b>3. Sesi Foto:</b> Hitungan mundur 3 detik sebelum tiap foto dijepret.</p>
              <p className="nb-info-step text-sm leading-relaxed">🖼️ <b>4. Pilih Frame:</b> Ada {allFrames.length} frame custom PNG siap pakai.</p>
              <p className="nb-info-step text-sm leading-relaxed">💾 <b>5. Download:</b> Simpan hasil strip foto resolusi tinggi ke galeri HP atau PC!</p>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowInfoModal(false);
                }}
                className="nb-btn nb-btn-primary nb-btn-lg mt-1 w-full text-sm"
              >
                MENGERTI, AYO FOTO!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}