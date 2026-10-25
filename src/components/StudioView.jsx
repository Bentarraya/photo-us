import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  PaintBucket,
  Trash2,
  Download,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Type,
  Save,
  RotateCcw,
  Plus
} from 'lucide-react';
import { getFrameById, renderFrame, exportFrame, formatPhotoboothDate, drawDebugSlots, getFrameGeometry } from '../frames';
import { playClickSound, playFanfareSound } from '../utils/sound';
import FramePicker from './FramePicker';

export default function StudioView({
  photos,
  selectedFrameId,
  onRetake,
  onSelectFrame,
  shotsPerStrip,
  frames = [],
  onFillSlots
}) {
  const canvasRef = useRef(null);
  const fillInputRef = useRef(null);
  const [caption, setCaption] = useState('PHOTO-US');
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showToast, setShowToast] = useState(null);
  const [frame, setFrame] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Render the studio preview at up to 2x device pixels so the frame and the
  // high-resolution photos stay crisp on retina/mobile screens. The export
  // path has its own resolution and is not affected.
  const [previewScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Load frame data
  useEffect(() => {
    async function loadFrame() {
      const f = await getFrameById(selectedFrameId);
      setFrame(f);
      if (f) {
        const geo = await getFrameGeometry(f, shotsPerStrip);
        setCanvasSize({ width: geo.width, height: geo.height });
      }
    }
    loadFrame();
  }, [selectedFrameId, shotsPerStrip]);

  // Update canvas intrinsic size when frame geometry changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvasSize.width > 0 && canvasSize.height > 0) {
      canvas.width = Math.round(canvasSize.width * previewScale);
      canvas.height = Math.round(canvasSize.height * previewScale);
    }
  }, [canvasSize, previewScale]);

  const dateStr = formatPhotoboothDate();

  // Render frame to canvas
  const doRenderFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !frame || !photos.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset any previous transform and clear stale pixels before redrawing.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(previewScale, previewScale);

    await renderFrame(ctx, frame, photos, shotsPerStrip, {
      caption,
      dateStr,
      canvasW: canvasSize.width,
      canvasH: canvasSize.height
    });

    // Debug overlay for ?debugframes=1
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debugframes') === '1') {
        await drawDebugSlots(ctx, frame, shotsPerStrip, canvas.width, canvas.height);
      }
    }
  }, [frame, photos, shotsPerStrip, caption, dateStr, canvasSize, previewScale]);

  // Re-render when dependencies change
  useEffect(() => {
    doRenderFrame();
  }, [doRenderFrame]);

  // Handle frame selection
  const handleSelectFrame = (frameId) => {
    onSelectFrame(frameId);
    setShowFramePicker(false);
    playClickSound();
  };

  // Download the strip
  const handleExport = async () => {
    if (!frame) return;

    setIsExporting(true);
    setExportProgress(0);

    const progressInterval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      const canvas = await exportFrame(frame, photos, shotsPerStrip, {
        caption,
        dateStr,
        scale: 3
      });

      if (!canvas) throw new Error('Export failed');

      setExportProgress(100);

      // Prefer a Blob URL over a multi-megabyte data URL: iOS Safari handles
      // large downloads much better and it avoids keeping a huge base64
      // string in memory. Fall back to toDataURL on very old browsers.
      const blob = await new Promise((resolve) => {
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob(resolve, 'image/png');
        } else {
          resolve(null);
        }
      });

      const link = document.createElement('a');
      link.download = `photo-us-${Date.now()}.png`;
      if (blob) {
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }

      clearInterval(progressInterval);
      setShowToast('Foto berhasil disimpan!');
      playFanfareSound();
    } catch (err) {
      console.error('Export failed:', err);
      setShowToast('Gagal menyimpan foto');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    }
  };

  // Filled slot = retake it with the camera. Empty slot = fill that exact
  // slot with the camera while keeping all other photos intact.
  const handleSlotClick = (slotIdx) => {
    playClickSound();
    onRetake(slotIdx);
  };

  // Gallery shortcut: add one or more photos to the empty slots.
  const handleAddPhotos = () => {
    playClickSound();
    if (fillInputRef.current) {
      fillInputRef.current.value = '';
      fillInputRef.current.click();
    }
  };

  const handleFillFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0 || !onFillSlots) return;

    const emptySlots = [];
    for (let i = 0; i < shotsPerStrip; i++) {
      if (!photos[i]) emptySlots.push(i);
    }
    if (emptySlots.length === 0) return;

    const selectedFiles = files.slice(0, emptySlots.length);
    const readers = selectedFiles.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target && ev.target.result);
      reader.readAsDataURL(file);
    }));

    Promise.all(readers).then(images => {
      const entries = images
        .map((dataUrl, idx) => ({ index: emptySlots[idx], dataUrl }))
        .filter(entry => entry.dataUrl);
      if (entries.length > 0) {
        onFillSlots(entries);
        playFanfareSound();
      }
    });
  };

  // Retake all
  const handleRetakeAll = () => {
    playClickSound();
    onRetake(-1);
  };

  // Get frame to know number of slots
  const slotCount = shotsPerStrip;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="nb-header nb-card mb-5 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleRetakeAll}
            className="nb-btn nb-btn-danger nb-btn-icon min-h-[44px] min-w-[44px]"
            title="Ambil Ulang Semua"
            aria-label="Ambil ulang semua"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display flex items-center gap-1.5 text-base leading-none tracking-tight sm:text-xl">
              PHOTO-US <span className="text-nb-pink anim-heart">❤</span>
            </h1>
            <p className="nb-meta mt-1 hidden sm:block">
              EDIT &amp; SIMPAN HASIL
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFramePicker(true)}
            className="nb-btn nb-btn-purple min-h-[44px]"
            title="Ganti Frame"
            aria-label="Ganti frame"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span className="font-bold">FRAME</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Frame Canvas */}
        <div className="mb-6 w-full max-w-3xl mx-auto">
          <div className="nb-preview p-2 sm:p-3">
            <div
              className="nb-preview-canvas w-full"
              style={{
                aspectRatio: canvasSize.width > 0 && canvasSize.height > 0 ? canvasSize.width / canvasSize.height : 'auto'
              }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full object-contain"
              />
              {!photos.length && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950">
                  <div className="nb-empty-state text-white">
                    <div className="nb-empty-icon">
                      <Camera size={28} strokeWidth={2.5} aria-hidden="true" />
                    </div>
                    <p className="nb-meta text-white/70">Tidak ada foto</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slot Indicators - Show filled/empty slots with retake option */}
        <div className="w-full max-w-3xl mx-auto mb-4">
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: slotCount }).map((_, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={photos[idx] ? `Retake foto #${idx + 1}` : `Isi slot #${idx + 1}`}
                onClick={() => handleSlotClick(idx)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSlotClick(idx);
                  }
                }}
                className={`nb-thumb ${photos[idx] ? 'is-filled' : 'is-empty'}`}
                title={photos[idx] ? `Retake foto #${idx + 1}` : `Tambah foto ke slot #${idx + 1}`}
              >
                {photos[idx] ? (
                  <>
                    <img src={photos[idx]} alt={`Slot ${idx+1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100">
                      <RotateCcw size={16} aria-hidden="true" />
                    </div>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-1 font-mono font-bold text-nb-muted">
                    <Plus size={16} className="text-nb-pink" aria-hidden="true" />
                    <span className="text-[10px]">#{idx + 1}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          <input
            ref={fillInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFillFiles}
            className="hidden"
          />
          <div className="mt-2 flex flex-col items-center gap-2">
            <p className="nb-meta text-center">
              {photos.filter(Boolean).length} / {slotCount} slot terisi
            </p>
            {photos.filter(Boolean).length < slotCount && (
              <button
                type="button"
                onClick={handleAddPhotos}
                className="nb-btn nb-btn-teal min-h-[44px] text-xs"
                title="Tambah foto ke slot yang masih kosong"
              >
                <ImageIcon size={16} aria-hidden="true" />
                <span className="font-bold">TAMBAH FOTO DARI GALERI</span>
              </button>
            )}
          </div>
        </div>

        {/* Caption Editor */}
        <div className="mb-6 w-full max-w-3xl mx-auto">
          <div className="nb-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Type size={20} className="text-nb-pink" aria-hidden="true" />
              <span className="nb-label">TEKS CAPTION</span>
            </div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 30))}
              maxLength={30}
              placeholder="Masukkan caption (maks 30 karakter)"
              className="nb-input nb-caption-input"
            />
            <p className="nb-meta mt-2 text-center">
              {caption.length}/30 karakter
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="nb-studio-actions w-full max-w-3xl mx-auto">
          <button
            type="button"
            onClick={handleRetakeAll}
            disabled={isExporting}
            className="nb-btn nb-btn-primary nb-btn-lg min-h-[52px] flex-1 text-sm font-bold"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            <span>AMBIL ULANG</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !photos.length}
            className="nb-btn nb-btn-teal nb-btn-lg min-h-[52px] flex-1 text-sm font-bold"
          >
            {isExporting ? (
              <>
                <Save size={20} className="anim-blink" aria-hidden="true" />
                <span>MENYIMPAN... {exportProgress}%</span>
              </>
            ) : (
              <>
                <Download size={20} aria-hidden="true" />
                <span>SIMPAN FOTO</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onRetake(-1);
            }}
            className="nb-btn nb-btn-blue nb-btn-lg min-h-[52px]"
            title="Ambil foto tambahan"
          >
            <Camera size={18} aria-hidden="true" />
            <span>TAMBAH</span>
          </button>
        </div>

        {/* Frame Info */}
        <div className="nb-meta w-full max-w-3xl mx-auto py-2 text-center">
          Frame: {frame?.name} • {shotsPerStrip} foto • {frame?.layout}
        </div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="nb-toast animate-slide-up" role="status" aria-live="polite">
          {showToast}
        </div>
      )}

      {/* Frame Picker Modal */}
      <FramePicker
        visible={showFramePicker}
        onClose={() => setShowFramePicker(false)}
        onSelect={handleSelectFrame}
        selectedFrameId={selectedFrameId}
        frames={frames}
      />
    </div>
  );
}