import React, { useState, useEffect, useCallback } from 'react';
import CameraView from './components/CameraView';
import StudioView from './components/StudioView';
import { FILTERS_REGISTRY } from './filters';
import { getAllFrames, getFrameById, getFramesForShots, getCustomFramesForShots } from './frames';
import { Camera, Heart, HelpCircle, Dice5, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="pixel-box p-8 max-w-md mx-auto">
            <div className="text-4xl mb-4">📷</div>
            <p className="font-mono text-sm text-zinc-600">Memuat frame...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="app-container">
        {/* Retro Pixel Header */}
        <header className="pixel-box p-4 mb-6 flex justify-between items-center bg-white shadow-md">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleRetake}>
            <div className="w-10 h-10 bg-pink-500 border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_#000]">
              <Camera size={22} />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-bold tracking-wider flex items-center gap-1.5">
                PHOTO-US <span className="text-pink-500 anim-heart">❤</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono hidden sm:block">
                PIXEL PHOTOBOOTH • WYSIWYG LIVE FILTERS & FRAMES
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSurpriseAll}
              className="pixel-btn text-[10px] py-2 px-3 pixel-btn-accent flex items-center gap-1.5 min-h-[40px]"
              title="Acak Filter & Frame (Surprise Me)"
            >
              <Dice5 size={16} />
              <span className="hidden sm:inline font-bold">ACAK</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setShowInfoModal(true);
              }}
              className="pixel-btn pixel-btn-icon bg-yellow-300 min-h-[40px] min-w-[40px]"
              title="Panduan"
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

        {/* Retro Pixel Footer */}
        <footer className="mt-5 text-center text-[10px] text-zinc-500 font-mono py-2">
          <div className="flex justify-center items-center gap-2">
            <span>[PHOTO-US v2.0]</span>
            <span>•</span>
            <span>{allFrames.length} FRAMES &amp; {FILTERS_REGISTRY.length} FILTERS</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-pink-600">
              MADE WITH <Heart size={10} className="fill-pink-500" />
            </span>
          </div>
        </footer>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="pixel-box-lg p-5 max-w-sm w-full bg-white flex flex-col gap-3">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <span className="font-bold text-xs flex items-center gap-1">
                <Sparkles size={16} className="text-yellow-500" /> CARA PAKAI PHOTO-US
              </span>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-xs font-bold px-2 py-1 bg-zinc-200 border border-black hover:bg-zinc-300 min-h-[36px] min-w-[36px]"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-mono flex flex-col gap-2 leading-relaxed">
              <p>📷 <b>1. Buka Kamera:</b> Tekan "Mulai Kamera" di iPhone, Android, atau PC.</p>
              <p>✨ <b>2. Pilih Filter:</b> Pilih dari 10 filter live (Original, Vivid, Dramatic, Mono, dll).</p>
              <p>⏱️ <b>3. Sesi Foto:</b> Hitungan mundur 3 detik sebelum tiap foto dijepret.</p>
              <p>🖼️ <b>4. Pilih Frame:</b> Ada {allFrames.length} frame custom PNG siap pakai.</p>
              <p>💾 <b>5. Download:</b> Simpan hasil strip foto resolusi tinggi ke galeri HP atau PC!</p>
            </div>

            <button
              onClick={() => {
                playClickSound();
                setShowInfoModal(false);
              }}
              className="pixel-btn pixel-btn-primary w-full text-xs mt-2 min-h-[44px]"
            >
              MENGERTI, AYO FOTO!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}