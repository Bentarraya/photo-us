import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Volume2, VolumeX, Sparkles, Image as ImageIcon, Monitor, AlertTriangle, Dice5, HelpCircle, RotateCcw } from 'lucide-react';
import { startCameraStream, stopActiveStream } from '../camera/startCamera';
import { FILTERS_REGISTRY, getFilterById } from '../filters';
import { applyIphoneFilter } from '../filters/iphoneFilters';
import { IPHONE_FILTER_PRESETS, IPHONE_FILTERS_ORDER, getIphoneFilterById } from '../filters/iphonePresets';
import { playCountdownBeep, playSnapSound, playFanfareSound, playClickSound, setSoundEnabled } from '../utils/sound';
import FramePicker from './FramePicker';

// Normalize a photo list to exactly `count` slots, keeping slot order.
// Missing/extra entries become null so empty slots stay explicit.
function normalizePhotos(photos, count) {
  const out = new Array(Math.max(0, count)).fill(null);
  (photos || []).forEach((photo, idx) => {
    if (idx < out.length && photo) out[idx] = photo;
  });
  return out;
}

function photosEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Live preview is intentionally small for performance. Final photos are
// captured from the video at (almost) native resolution, never from this
// preview canvas, so a 480px preview can never limit export quality.
const PREVIEW_MAX_HEIGHT = 1920;
const CAPTURE_MAX_HEIGHT = 1920; // Guard against huge 4K frames on mobile
const PREVIEW_TARGET_ASPECT = 4 / 5; // Portrait 3:4

// Center-crop a video frame to the portrait 3:4 aspect used by every slot.
function getPortraitCrop(vw, vh) {
  const videoAspect = vw / vh;
  if (videoAspect > PREVIEW_TARGET_ASPECT) {
    // Video is wider than target - crop the sides
    const sHeight = vh;
    const sWidth = Math.round(vh * PREVIEW_TARGET_ASPECT);
    return {
      sx: Math.floor((vw - sWidth) / 2),
      sy: 0,
      sWidth,
      sHeight
    };
  }
  // Video is taller than target - crop top/bottom
  const sWidth = vw;
  const sHeight = Math.round(vw / PREVIEW_TARGET_ASPECT);
  return {
    sx: 0,
    sy: Math.floor((vh - sHeight) / 2),
    sWidth,
    sHeight
  };
}


export default function CameraView({
  layout = { name: 'Classic Strip', count: 4 },
  currentFrame,
  shotsPerStrip = 4,
  onSelectShotsPerStrip,
  onPhotosCaptured,
  selectedFilterId,
  onSelectFilter,
  onSelectFrame,
  selectedFrameId,
  allFrames = [],
  retakeSlot = null,
  existingPhotos = [],
  onRetakeSlotHandled
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const handledRetakeRef = useRef(null);

  // Camera states
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'loading' | 'active' | 'error'
  const [cameraErrorDetail, setCameraErrorDetail] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [isMirrored, setIsMirrored] = useState(true);

  // Capture session states
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [capturedShots, setCapturedShots] = useState(() =>
    normalizePhotos(existingPhotos, shotsPerStrip || layout?.count || 4)
  );
  const [soundOn, setSoundOn] = useState(true);
  const [retakeSlotIndex, setRetakeSlotIndex] = useState(null);

  // Frame picker modal
  const [showFramePicker, setShowFramePicker] = useState(false);

  // Debug panel (?debug=1)
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // Dev tuning panel (?tune=1)
  const [showTune, setShowTune] = useState(false);
  const [tuneParams, setTuneParams] = useState(null);

  const allowedShots = currentFrame?.allowedShots || layout?.allowedShots || [1, 2, 3, 4, 6];
  const [localShots, setLocalShots] = useState(shotsPerStrip || layout?.count || 4);
  const totalShots = shotsPerStrip ?? localShots;

  // Keep local slots in sync with the photos owned by App. This is what makes
  // "fill an empty slot" / "retake one slot" preserve all the other photos.
  useEffect(() => {
    if (isCapturing) return;
    setCapturedShots(prev => {
      const next = normalizePhotos(existingPhotos, totalShots);
      return photosEqual(prev, next) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPhotos, totalShots]);

  const handleSelectShots = (count) => {
    playClickSound();
    setLocalShots(count);
    if (onSelectShotsPerStrip) {
      onSelectShotsPerStrip(count);
    }
  };

  const handleOpenFramePicker = () => {
    playClickSound();
    setShowFramePicker(true);
  };

  const handleCloseFramePicker = () => {
    playClickSound();
    setShowFramePicker(false);
  };

  const handlePickFrame = (id) => {
    playClickSound();
    onSelectFrame(id);
    setShowFramePicker(false);
  };

  const currentFilter = getFilterById(selectedFilterId);

  // Check URL query params for ?debug=1 and ?tune=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1') {
        setShowDebug(true);
      }
      if (params.get('tune') === '1') {
        setShowTune(true);
        // Initialize tune params from current filter
        const filter = getIphoneFilterById(selectedFilterId);
        setTuneParams({ ...filter });
      }
    }
  }, []);

  // Handle incoming retakeSlot prop - auto-start a single slot retake/fill
  // once the camera is ready. The parent clears the prop via the callback.
  useEffect(() => {
    if (retakeSlot === null || retakeSlot === undefined) {
      handledRetakeRef.current = null;
      setRetakeSlotIndex(null);
      return;
    }

    // Remember the target before the camera starts so the upload fallback
    // (e.g. camera permission denied) fills the requested slot too.
    setRetakeSlotIndex(prev => (prev === retakeSlot ? prev : retakeSlot));

    if (cameraState !== 'active' || isCapturing) return;
    if (handledRetakeRef.current === retakeSlot) return;

    handledRetakeRef.current = retakeSlot;
    if (onRetakeSlotHandled) onRetakeSlotHandled();
    handleRetakeSingleSlot(retakeSlot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retakeSlot, cameraState, isCapturing]);

  // Update debug stats periodically
  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      const track = video?.srcObject?.getVideoTracks?.()[0];
      const settings = track?.getSettings?.() || {};
      const captureCanvas = captureCanvasRef.current;
      setDebugInfo({
        locationHref: typeof window !== 'undefined' ? window.location.href : 'N/A',
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
        cameraError: cameraErrorDetail?.reason,
        cameraErrorMessage: cameraErrorDetail?.message,
        hasMediaDevices: !!navigator?.mediaDevices?.getUserMedia,
        userAgent: navigator?.userAgent || 'unknown',
        videoWidth: video?.videoWidth || 0,
        videoHeight: video?.videoHeight || 0,
        streamWidth: settings.width || 0,
        streamHeight: settings.height || 0,
        streamFrameRate: settings.frameRate || 0,
        captureWidth: captureCanvas?.width || 0,
        captureHeight: captureCanvas?.height || 0,
        readyState: video?.readyState || 0,
        cameraState,
        activeFilter: currentFilter.id
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDebug, cameraState, currentFilter]);

  // Start Camera with user gesture support
  const handleStartCamera = async () => {
    playClickSound();
    setCameraState('loading');
    setCameraErrorDetail(null);

    const result = await startCameraStream(videoRef.current, cameraFacing);

    if (result.ok) {
      setCameraState('active');
    } else {
      setCameraState('error');
      setCameraErrorDetail(result);
    }
  };

  // Flip camera front/back
  const toggleCameraFacing = async () => {
    playClickSound();
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    setIsMirrored(nextFacing === 'user');

    if (cameraState === 'active') {
      setCameraState('loading');
      const res = await startCameraStream(videoRef.current, nextFacing);
      if (res.ok) {
        setCameraState('active');
      } else {
        setCameraState('error');
        setCameraErrorDetail(res);
      }
    }
  };

  // Live filter rendering loop
  useEffect(() => {
    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && cameraState === 'active' && video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Target portrait 3:4 aspect ratio for vertical frames.
        // Preview resolution stays small; capture uses its own canvas.
        const canvasH = Math.min(vh, PREVIEW_MAX_HEIGHT);
        const canvasW = Math.round(canvasH * PREVIEW_TARGET_ASPECT);

        if (canvas.width !== canvasW || canvas.height !== canvasH) {
          canvas.width = canvasW;
          canvas.height = canvasH;
        }

        const crop = getPortraitCrop(vw, vh);
        const activePreset = showTune && tuneParams ? tuneParams : selectedFilterId;
        try {
          applyIphoneFilter(canvas, video, activePreset, {
            ...crop,
            // Signal preview mode so crop happens in the shader/texture
            isPreview: true
          });
        } catch (err) {
          console.warn('[camera] Preview filter failed:', err);
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      } else {
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cameraState, selectedFilterId, isMirrored, cameraFacing]);

  // Clean up streams on unmount / pagehide
  useEffect(() => {
    const handlePageHide = () => stopActiveStream();
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      stopActiveStream();
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Audio toggle
  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
    if (nextState) playClickSound();
  };

  // Surprise Me 🎲 (Random Filter)
  const handleSurpriseFilter = () => {
    playClickSound();
    const randomIndex = Math.floor(Math.random() * FILTERS_REGISTRY.length);
    const chosen = FILTERS_REGISTRY[randomIndex];
    onSelectFilter(chosen.id);
  };

  // Capture a full-resolution snapshot straight from the video stream.
  // The live preview canvas is intentionally small (PREVIEW_MAX_HEIGHT), so it
  // must never be the source of a saved photo.
  const takeFilteredSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const crop = getPortraitCrop(video.videoWidth, video.videoHeight);

    // Use the native crop size, only shrinking very large (4K) sources.
    const targetH = Math.min(crop.sHeight, CAPTURE_MAX_HEIGHT);
    const targetW = Math.max(1, Math.round(targetH * PREVIEW_TARGET_ASPECT));

    let captureCanvas = captureCanvasRef.current;
    if (!captureCanvas) {
      captureCanvas = document.createElement('canvas');
      captureCanvasRef.current = captureCanvas;
    }
    if (captureCanvas.width !== targetW || captureCanvas.height !== targetH) {
      captureCanvas.width = targetW;
      captureCanvas.height = targetH;
    }

    // Use the tuned params when the tuning panel is active, otherwise the
    // selected filter - exactly like the live preview.
    const activePreset = showTune && tuneParams ? tuneParams : selectedFilterId;

    let ok = false;
    try {
      ok = applyIphoneFilter(captureCanvas, video, activePreset, {
        ...crop,
        // Non-preview mode crops the exact source pixels before filtering
        isPreview: false
      });
    } catch (err) {
      console.warn('[camera] Capture filter failed:', err);
    }

    const encode = (source) => {
      const srcW = source.width;
      const srcH = source.height;
      if (!srcW || !srcH) return null;

      if (isMirrored) {
        // Flip the captured frame so the saved photo matches the mirrored preview
        const flipped = document.createElement('canvas');
        flipped.width = srcW;
        flipped.height = srcH;
        const ctx = flipped.getContext('2d');
        if (!ctx) return null;
        ctx.translate(srcW, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 0, 0);
        return flipped.toDataURL('image/jpeg', 0.97);
      }

      return source.toDataURL('image/jpeg', 0.97);
    };

    if (!ok) {
      // Last-resort fallback so a filter/capture failure never loses the shot.
      console.warn('[camera] High-res capture failed, using preview canvas');
      const previewCanvas = canvasRef.current;
      if (!previewCanvas) return null;
      return encode(previewCanvas);
    }

    return encode(captureCanvas);
  };

  // Multi-shot sequence workflow - fills empty slots or (re)takes one slot.
  const startPhotoSession = async (targetSlot = null) => {
    if (isCapturing || cameraState !== 'active') return;

    playClickSound();
    setIsCapturing(true);
    setCurrentShotIndex(0);

    // Initialize with current captured shots so existing photos are preserved
    const shots = normalizePhotos(capturedShots, totalShots);

    let slotIndices;
    if (targetSlot !== null && targetSlot !== undefined) {
      if (targetSlot < 0 || targetSlot >= totalShots) {
        setIsCapturing(false);
        return;
      }
      slotIndices = [targetSlot];
    } else {
      // Fill only the empty slots. When everything is already filled, a new
      // session replaces all photos instead of doing nothing.
      slotIndices = [];
      for (let i = 0; i < totalShots; i++) {
        if (!shots[i]) slotIndices.push(i);
      }
      if (slotIndices.length === 0) {
        slotIndices = Array.from({ length: totalShots }, (_, i) => i);
      }
    }

    setCapturedShots([...shots]);

    // Make sure the video stream has a frame available before snapping.
    for (let attempt = 0; attempt < 20; attempt++) {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) break;
      await new Promise(r => setTimeout(r, 100));
    }

    for (let seq = 0; seq < slotIndices.length; seq++) {
      const i = slotIndices[seq];
      setCurrentShotIndex(i + 1);

      // Countdown 3, 2, 1
      for (let sec = 3; sec >= 1; sec--) {
        setCountdown(sec);
        playCountdownBeep(false);
        await new Promise(r => setTimeout(r, 900));
      }

      setCountdown(null);
      playCountdownBeep(true);

      // Flash & Snap
      setShowFlash(true);
      playSnapSound();
      const photoData = takeFilteredSnapshot();
      if (photoData) {
        shots[i] = photoData;
        setCapturedShots([...shots]);
      }

      await new Promise(r => setTimeout(r, 400));
      setShowFlash(false);

      if (seq < slotIndices.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    playFanfareSound();
    setIsCapturing(false);
    setRetakeSlotIndex(null);
    onPhotosCaptured([...shots]);
  };

  // Fill or retake a single slot while keeping every other slot intact.
  const handleRetakeSingleSlot = async (slotIdx) => {
    if (isCapturing || cameraState !== 'active') return;

    playClickSound();
    setRetakeSlotIndex(slotIdx);
    await startPhotoSession(slotIdx);
  };

  // Upload manual fallback - supports multiple files, fills empty slots first
  // (or the specific slot being retaken) and preserves the rest.
  const handleFileUpload = (e) => {
    playClickSound();
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const next = normalizePhotos(capturedShots, totalShots);

    let destination = [];
    if (retakeSlotIndex !== null && retakeSlotIndex >= 0 && retakeSlotIndex < totalShots) {
      destination.push(retakeSlotIndex);
    }
    for (let i = 0; i < totalShots; i++) {
      if (i !== retakeSlotIndex && !next[i]) destination.push(i);
    }
    if (destination.length === 0) {
      destination = Array.from({ length: totalShots }, (_, i) => i);
    }

    const selectedFiles = files.slice(0, destination.length);
    const readers = selectedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(images => {
      images.forEach((img, idx) => {
        if (idx < destination.length) next[destination[idx]] = img;
      });
      setCapturedShots(next);
      setRetakeSlotIndex(null);
      playFanfareSound();
      onPhotosCaptured(next);
    });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Camera top bar */}
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleOpenFramePicker}
          className="nb-chip nb-chip--frame min-w-0 max-w-full"
          aria-haspopup="dialog"
          aria-label={`Ganti frame, frame aktif ${currentFrame?.name || layout.name}`}
          title="Pilih frame"
        >
          <ImageIcon size={16} aria-hidden="true" />
          <span className="truncate">FRAME: {currentFrame?.name || layout.name}</span>
        </button>

        {/* Frame picker modal - uses shared FramePicker component */}
        <FramePicker
          visible={showFramePicker}
          onClose={handleCloseFramePicker}
          onSelect={handlePickFrame}
          selectedFrameId={selectedFrameId}
          frames={allFrames}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            className="nb-btn nb-btn-blue nb-btn-icon"
            title={soundOn ? 'Mute' : 'Unmute'}
            aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Segmented control for shots per strip */}
      <div className="nb-card nb-card-sm mb-5 flex w-full flex-wrap items-center justify-between gap-3 p-3">
        <span className="nb-label flex items-center gap-1">SHOTS PER STRIP:</span>

        <div className="nb-segmented" role="group" aria-label="Shots per strip selector">
          {[1, 2, 3, 4, 6].map((num) => {
            const isAllowed = allowedShots.includes(num);
            const isSelected = totalShots === num;

            return (
              <button
                key={num}
                type="button"
                disabled={!isAllowed || isCapturing}
                onClick={() => (!isAllowed || isCapturing) ? null : handleSelectShots(num)}
                aria-pressed={isSelected}
                className={`nb-segment ${isSelected ? 'is-active' : ''} ${(!isAllowed || isCapturing) ? 'is-disabled' : ''}`}
                title={
                  !isAllowed
                    ? `${num} Shots tidak didukung untuk frame ${currentFrame?.name || layout.name}`
                    : `Pilih ${num} Shots per strip`
                }
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main camera stage */}
      <div className="nb-camera relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden sm:aspect-[4/3]">
        {showFlash && <div className="flash-screen" />}

        {/* Background hidden Video Stream for processing */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="hidden"
        />

        {/* Live Filtered Canvas (WYSIWYG) */}
        <canvas
          ref={canvasRef}
          className={`h-full w-full object-cover ${cameraState === 'active' ? 'block' : 'hidden'} ${isMirrored ? 'mirror-x' : ''}`}
          style={isMirrored ? { transform: 'scaleX(-1)' } : {}}
        />

        {/* IDLE STATE: User Gesture Button */}
        {cameraState === 'idle' && (
          <div className="nb-camera-state justify-center bg-zinc-950">
            <div className="nb-empty-state text-white">
              <div className="nb-empty-icon">
                <Camera size={28} strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h3 className="font-display text-base leading-tight tracking-tight">PHOTO-US KAMERA</h3>
              <p className="max-w-xs font-sans text-xs leading-relaxed text-white/70">
                {retakeSlot !== null && retakeSlot !== undefined
                  ? `Nyalakan kamera untuk mengisi slot #${retakeSlot + 1}. Slot lain tetap tersimpan.`
                  : 'Sentuh tombol di bawah untuk membuka kamera di iPhone, Android, atau PC Anda.'}
              </p>
              <button
                type="button"
                onClick={handleStartCamera}
                className="nb-btn nb-btn-primary nb-btn-lg text-xs"
              >
                <Camera size={18} aria-hidden="true" /> MULAI KAMERA
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {cameraState === 'loading' && (
          <div className="nb-camera-state justify-center bg-zinc-900/90 backdrop-blur-xs">
            <div className="countdown-badge mb-3 anim-blink">⏳</div>
            <p className="font-mono text-sm text-white/70">Menunggu izin kamera dari browser...</p>
          </div>
        )}

        {/* ERROR / DENIED / INSECURE CONTEXT STATE */}
        {cameraState === 'error' && (
          <div className="nb-camera-state justify-start bg-zinc-950">
            <AlertTriangle size={38} className="mb-2 text-nb-yellow" aria-hidden="true" />
            <div className="nb-alert mb-3 w-full max-w-sm text-left">
              <p className="text-xs font-bold">
                {cameraErrorDetail?.message || 'Kamera gagal dimulai.'}
              </p>
            </div>

            {/* Platform specific resolution instructions */}
            <div className="nb-code-card mb-3 w-full max-w-sm text-left">
              {cameraErrorDetail?.reason === 'denied' && (
                <>
                  <p className="mb-1 font-bold">Cara mengaktifkan kembali:</p>
                  <p className="mb-1">📱 <b>iPhone / Safari:</b> Masuk ke <i>Settings → Safari → Camera</i> ubah ke "Allow", atau klik logo <b>aA</b> di address bar → <i>Website Settings → Camera → Allow</i>.</p>
                  <p>💻 <b>Mac Safari:</b> Buka <i>Safari → Settings → Websites → Camera</i> ubah situs ini ke "Allow".</p>
                </>
              )}
              {cameraErrorDetail?.reason === 'insecure-context' && (
                <p>⚠️ Kamera memerlukan koneksi HTTPS. Jalankan <code>npm run dev:https</code> atau akses via HTTPS.</p>
              )}
              {cameraErrorDetail?.reason === 'in-app-browser' && (
                <p>⚠️ Buka tautan ini di browser Safari atau Google Chrome langsung (bukan webview sosmed).</p>
              )}
              {(!cameraErrorDetail || cameraErrorDetail.reason === 'unknown' || cameraErrorDetail.reason === 'no-camera') && (
                <p>Pastikan kamera tidak digunakan oleh tab/aplikasi lain dan izin kamera telah diberikan.</p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleStartCamera}
                className="nb-btn nb-btn-primary text-xs"
              >
                COBA LAGI
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="nb-btn nb-btn-teal text-xs"
              >
                UPLOAD FOTO
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder HUD */}
        <div className="nb-camera-hud">
          <div className="flex items-center justify-between font-mono text-[9px] text-white/70">
            <span className="flex items-center gap-1">
              <span className="anim-blink inline-block h-2 w-2 rounded-full bg-red-500" /> REC
            </span>
            <span>FILTER: {currentFilter.name.toUpperCase()}</span>
          </div>
          <div className="flex justify-between font-mono text-[9px] text-white/50">
            <span>[+] FOCUS</span>
            <span>BATTERY: 99%</span>
          </div>
        </div>

        {/* Countdown Overlay */}
        {countdown && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="countdown-badge">{countdown}</div>
            <div className="mt-3 rounded-xl border-2 border-white/20 bg-black/70 p-2">
              <span className="nb-pill">POSE {currentShotIndex} DARI {totalShots}!</span>
            </div>
          </div>
        )}

        {/* Banner between shots */}
        {isCapturing && !countdown && (
          <div className="nb-camera-banner absolute inset-x-4 top-4 z-20">
            BERSIAP UNTUK FOTO KE-{currentShotIndex} / {totalShots}...
          </div>
        )}

        {/* Bottom floating camera controls */}
        {cameraState === 'active' && (
          <div className="pointer-events-auto absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleCameraFacing}
              disabled={isCapturing}
              className="nb-btn nb-btn-icon"
              title="Ganti Kamera Depan/Belakang"
              aria-label="Ganti kamera depan atau belakang"
            >
              <RefreshCw size={18} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setIsMirrored(!isMirrored)}
              disabled={isCapturing}
              className={`nb-btn min-h-[44px] px-3 ${isMirrored ? 'nb-btn-primary' : ''}`}
              aria-pressed={isMirrored}
              aria-label={isMirrored ? 'Matikan mirror' : 'Nyalakan mirror'}
            >
              {isMirrored ? 'MIRROR: ON' : 'MIRROR: OFF'}
            </button>
          </div>
        )}
      </div>

      {/* FILTER SELECTOR: Horizontally scrollable chip row */}
      <div className="mt-7 w-full">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="nb-label">PILIH FILTER LIVE ({FILTERS_REGISTRY.length}):</span>
          <span className="nb-pill">{currentFilter.name}</span>
        </div>
        <div className="nb-filter-rail px-1">
          {FILTERS_REGISTRY.map((filt) => (
            <button
              key={filt.id}
              type="button"
              onClick={() => {
                playClickSound();
                onSelectFilter(filt.id);
              }}
              aria-pressed={selectedFilterId === filt.id}
              className={`nb-chip shrink-0 ${selectedFilterId === filt.id ? 'is-active' : ''}`}
            >
              <span className="text-sm" aria-hidden="true">{filt.emoji}</span>
              <span className="whitespace-nowrap font-bold">{filt.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Captured shots progress preview row */}
      {totalShots >= 1 && (
        <div className="mt-5 flex w-full flex-wrap justify-center gap-3 px-2">
          {Array.from({ length: totalShots }).map((_, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              aria-label={capturedShots[idx] ? `Retake foto #${idx + 1}` : `Isi slot #${idx + 1}`}
              onClick={() => handleRetakeSingleSlot(idx)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleRetakeSingleSlot(idx);
                }
              }}
              className={`nb-thumb ${capturedShots[idx] ? 'is-filled' : 'is-empty'} ${
                currentShotIndex === idx + 1 && isCapturing ? 'is-active' : ''
              }`}
              title={capturedShots[idx] && !isCapturing ? `Klik untuk retake foto #${idx + 1}` : `Slot #${idx + 1}`}
            >
              {capturedShots[idx] ? (
                <>
                  <img src={capturedShots[idx]} alt={`Shot ${idx+1}`} className="h-full w-full object-cover" />
                  {!isCapturing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100">
                      <RotateCcw size={16} aria-hidden="true" />
                    </div>
                  )}
                </>
              ) : (
                <span className="font-mono text-[10px] font-bold text-nb-muted">#{idx + 1}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Controls */}
      <div className="w-full flex flex-col sm:flex-row gap-3 mt-8 mb-6">
        <button
          onClick={() => startPhotoSession()}
          disabled={isCapturing || cameraState !== 'active'}
          className="pixel-btn pixel-btn-primary pixel-btn-lg flex-1 font-bold text-sm min-h-[52px]"
        >
          <Camera size={20} />
          {isCapturing ? `MENGAMBIL FOTO (${currentShotIndex}/${totalShots})...` : `MULAI SESI FOTO (${totalShots}x)`}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isCapturing}
          className="pixel-btn pixel-btn-cyan text-xs min-h-[52px] px-6"
          title="Upload foto dari galeri HP/PC"
        >
          <ImageIcon size={18} />
          <span className="xs:inline">UPLOAD</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Debug Panel (?debug=1) */}
      {showDebug && (
        <div className="w-full mt-4 p-3 bg-black text-green-400 font-mono text-[9px] border-2 border-green-500 text-left overflow-x-auto">
          <div className="font-bold text-white mb-1">[DEBUG PANEL (?debug=1)]</div>
          <div className="truncate">URL: {debugInfo.locationHref}</div>
          <div>isSecureContext: {String(debugInfo.isSecureContext)}</div>
          <div>navigator.mediaDevices: {String(debugInfo.hasMediaDevices)}</div>
          <div>video dimensions: {debugInfo.videoWidth} x {debugInfo.videoHeight} (readyState: {debugInfo.readyState})</div>
          <div>stream settings: {debugInfo.streamWidth} x {debugInfo.streamHeight} @ {debugInfo.streamFrameRate || 0}fps</div>
          <div>last capture canvas: {debugInfo.captureWidth} x {debugInfo.captureHeight}</div>
          <div>cameraState: {debugInfo.cameraState}</div>
          {debugInfo.cameraError && (
            <div className="text-red-400 font-bold">ERROR: {debugInfo.cameraError} - {debugInfo.cameraErrorMessage}</div>
          )}
          <div>activeFilter: {debugInfo.activeFilter}</div>
          <div className="truncate">userAgent: {debugInfo.userAgent}</div>
        </div>
      )}

      {/* Dev Tuning Panel (?tune=1) */}
      {showTune && tuneParams && (
        <div className="w-full mt-4 p-3 bg-zinc-900 text-white font-mono text-[10px] border-2 border-pink-500 text-left overflow-x-auto">
          <div className="font-bold text-pink-400 mb-2 flex items-center justify-between">
            <span>[TUNE PANEL (?tune=1)]</span>
            <button onClick={() => setShowTune(false)} className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600">TUTUP</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Filter:</span>
                <select
                  value={selectedFilterId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    onSelectFilter(newId);
                    setTuneParams({ ...getIphoneFilterById(newId) });
                  }}
                  className="bg-zinc-800 border border-zinc-600 px-2 py-1 text-[10px] rounded"
                >
                  {IPHONE_FILTERS_ORDER.map(id => (
                    <option key={id} value={id}>{IPHONE_FILTER_PRESETS[id].emoji} {IPHONE_FILTER_PRESETS[id].name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Exposure:</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={tuneParams.exposure}
                  onChange={(e) => setTuneParams({ ...tuneParams, exposure: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.exposure.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Contrast:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tuneParams.contrast}
                  onChange={(e) => setTuneParams({ ...tuneParams, contrast: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.contrast.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Saturation:</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={tuneParams.sat}
                  onChange={(e) => setTuneParams({ ...tuneParams, sat: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.sat.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Vibrance:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tuneParams.vibrance}
                  onChange={(e) => setTuneParams({ ...tuneParams, vibrance: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.vibrance.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Clarity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tuneParams.clarity}
                  onChange={(e) => setTuneParams({ ...tuneParams, clarity: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.clarity.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Gamma:</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={tuneParams.gamma}
                  onChange={(e) => setTuneParams({ ...tuneParams, gamma: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.gamma.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Black Point:</span>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={tuneParams.black}
                  onChange={(e) => setTuneParams({ ...tuneParams, black: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.black.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">White Point:</span>
                <input
                  type="range"
                  min="0.8"
                  max="1"
                  step="0.01"
                  value={tuneParams.white}
                  onChange={(e) => setTuneParams({ ...tuneParams, white: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.white.toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">WB R:</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={tuneParams.gain[0]}
                  onChange={(e) => setTuneParams({ ...tuneParams, gain: [parseFloat(e.target.value), tuneParams.gain[1], tuneParams.gain[2]] })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.gain[0].toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">WB G:</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={tuneParams.gain[1]}
                  onChange={(e) => setTuneParams({ ...tuneParams, gain: [tuneParams.gain[0], parseFloat(e.target.value), tuneParams.gain[2]] })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.gain[1].toFixed(2)}</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">WB B:</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={tuneParams.gain[2]}
                  onChange={(e) => setTuneParams({ ...tuneParams, gain: [tuneParams.gain[0], tuneParams.gain[1], parseFloat(e.target.value)] })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.gain[2].toFixed(2)}</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Mono:</span>
                <input
                  type="checkbox"
                  checked={tuneParams.mono}
                  onChange={(e) => setTuneParams({ ...tuneParams, mono: e.target.checked })}
                  className="accent-pink-500"
                />
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <span className="w-24 text-zinc-300">Tint Amt:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tuneParams.tintAmt}
                  onChange={(e) => setTuneParams({ ...tuneParams, tintAmt: parseFloat(e.target.value) })}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-zinc-300">{tuneParams.tintAmt.toFixed(2)}</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Apply tuned params as a temporary override
                console.log('[TUNE] Current params:', tuneParams);
              }}
              className="pixel-btn pixel-btn-primary text-xs px-3 py-1"
            >
              LOG PARAMS
            </button>
            <button
              onClick={() => {
                const filter = getIphoneFilterById(selectedFilterId);
                setTuneParams({ ...filter });
              }}
              className="pixel-btn text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600"
            >
              RESET
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
