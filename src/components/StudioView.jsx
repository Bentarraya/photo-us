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
      <header className="pixel-box p-4 mb-4 flex justify-between items-center bg-white shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetakeAll}
            className="pixel-btn pixel-btn-icon bg-red-500 min-h-[40px] min-w-[40px] text-white"
            title="Ambil Ulang Semua"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-wider flex items-center gap-1.5">
              PHOTO-US <span className="text-pink-500 anim-heart">❤</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono hidden sm:block">
              EDIT &amp; SIMPAN HASIL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFramePicker(true)}
            className="pixel-btn pixel-btn-cyan text-[10px] py-2 px-3 flex items-center gap-1.5 min-h-[40px]"
            title="Ganti Frame"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline font-bold">FRAME</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Frame Canvas */}
        <div className="w-full max-w-3xl mx-auto mb-6">
          <div className="pixel-box-lg bg-black relative overflow-hidden">
            <div
              className="relative w-full"
              style={{
                aspectRatio: canvasSize.width > 0 && canvasSize.height > 0 ? canvasSize.width / canvasSize.height : 'auto'
              }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain"
              />
              {!photos.length && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-zinc-950 z-10">
                  <Camera size={52} className="mx-auto mb-3 text-pink-400 anim-heart" />
                  <p className="text-xs font-mono text-zinc-300">Tidak ada foto</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slot Indicators - Show filled/empty slots with retake option */}
        <div className="w-full max-w-3xl mx-auto mb-4">
          <div className="flex justify-center gap-3 flex-wrap">
            {Array.from({ length: slotCount }).map((_, idx) => (
              <div
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`w-16 h-20 border-2 border-black flex items-center justify-center bg-zinc-200 overflow-hidden relative transition-all shadow-[2px_2px_0px_#000] ${
                  photos[idx] ? 'cursor-pointer hover:ring-2 hover:ring-pink-500 hover:scale-105 active:translate-y-0.5' : 'cursor-pointer hover:border-pink-500 hover:bg-pink-50'
                }`}
                title={photos[idx] ? `Retake foto #${idx + 1}` : `Tambah foto ke slot #${idx + 1}`}
              >
                {photos[idx] ? (
                  <>
                    <img src={photos[idx]} alt={`Slot ${idx+1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <RotateCcw size={16} />
                    </div>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-1 text-zinc-500 font-mono font-bold">
                    <Plus size={16} className="text-pink-500" />
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
          <div className="flex flex-col items-center gap-2 mt-2">
            <p className="text-center text-[10px] text-zinc-500 font-mono">
              {photos.filter(Boolean).length} / {slotCount} slot terisi
            </p>
            {photos.filter(Boolean).length < slotCount && (
              <button
                onClick={handleAddPhotos}
                className="pixel-btn pixel-btn-cyan text-[10px] px-3 py-2 min-h-[40px] flex items-center gap-1.5"
                title="Tambah foto ke slot yang masih kosong"
              >
                <ImageIcon size={14} />
                <span className="font-bold">TAMBAH FOTO DARI GALERI</span>
              </button>
            )}
          </div>
        </div>

        {/* Caption Editor */}
        <div className="w-full max-w-3xl mx-auto mb-6">
          <div className="pixel-box p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Type size={20} className="text-pink-500" />
              <span className="font-bold text-xs sm:text-sm text-zinc-800">TEKS CAPTION</span>
            </div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 30))}
              maxLength={30}
              placeholder="Masukkan caption (maks 30 karakter)"
              className="w-full pixel-box-sm p-3 text-center text-lg font-bold font-mono bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-pink-500"
              style={{ fontFamily: '"Silkscreen", monospace' }}
            />
            <p className="text-[10px] text-zinc-500 text-center mt-2 font-mono">
              {caption.length}/30 karakter
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleRetakeAll}
            disabled={isExporting}
            className="pixel-btn pixel-btn-primary pixel-btn-lg flex-1 font-bold text-sm min-h-[52px]"
          >
            <ArrowLeft size={20} />
            <span className="flex items-center justify-center">AMBIL ULANG</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || !photos.length}
            className="pixel-btn pixel-btn-green pixel-btn-lg flex-1 font-bold text-sm min-h-[52px]"
          >
            {isExporting ? (
              <>
                <Save size={20} className="anim-blink" />
                <span>MENYIMPAN... {exportProgress}%</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>SIMPAN FOTO</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              playClickSound();
              onRetake(-1);
            }}
            className="pixel-btn pixel-btn-cyan text-xs min-h-[52px] px-6"
            title="Ambil foto tambahan"
          >
            <Camera size={18} />
            <span className="xs:inline">TAMBAH</span>
          </button>
        </div>

        {/* Frame Info */}
        <div className="w-full max-w-3xl mx-auto text-center text-[10px] text-zinc-500 font-mono py-2">
          Frame: {frame?.name} • {shotsPerStrip} foto • {frame?.layout}
        </div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="pixel-box-lg px-6 py-3 bg-black text-white text-sm font-bold">
            {showToast}
          </div>
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