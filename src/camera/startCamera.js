// Robust camera helper for Cross-Browser & Safari iOS / macOS compatibility

let currentStream = null;

// Detect common in-app webviews that block camera
export function detectInAppBrowser() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /FBAN|FBAV|Instagram|TikTok|Line\/|KAKAOTALK|Snapchat|musical_ly|WhatsApp|Twitter|MicroMessenger/i.test(ua);
}

// Stop any globally active stream
export function stopActiveStream() {
  if (currentStream) {
    try {
      currentStream.getTracks().forEach(t => {
        t.stop();
      });
    } catch (e) {
      console.warn('Error stopping tracks:', e);
    }
    currentStream = null;
  }
}

/**
 * Start camera with thorough compatibility checks and error mapping
 * @param {HTMLVideoElement | null} videoElement 
 * @param {'user' | 'environment'} facingMode 
 * @returns {Promise<{ ok: true, stream: MediaStream } | { ok: false, reason: string, message: string }>}
 */
export async function startCameraStream(videoElement, facingMode = 'user') {
  // 1. Check In-App Browser
  if (detectInAppBrowser()) {
    return {
      ok: false,
      reason: 'in-app-browser',
      message: 'Browser dalam aplikasi (Instagram/TikTok/WhatsApp) sering memblokir kamera. Silakan buka tautan ini di browser Safari atau Chrome.'
    };
  }

  // 2. Check Secure Context
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (typeof window !== 'undefined' && !window.isSecureContext && !isLocal) {
    return {
      ok: false,
      reason: 'insecure-context',
      message: 'Kamera membutuhkan koneksi aman (HTTPS). Buka lewat https:// atau localhost.'
    };
  }

  // 3. Check MediaDevices support
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Browser Anda tidak mendukung API kamera (navigator.mediaDevices tidak tersedia).'
    };
  }

  // 4. Stop existing stream tracks first
  stopActiveStream();

  let stream = null;

  // 5. Request camera with fallback
  try {
    const preferredConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        // Ask for more than the live preview needs: final photos are captured
        // from this stream at native resolution, while preview is downscaled.
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
  } catch (err) {
    console.warn('Preferred camera constraints failed, attempting fallback { video: true }:', err);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (fallbackErr) {
      console.error('All camera attempts failed:', fallbackErr);
      const name = fallbackErr.name || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        return {
          ok: false,
          reason: 'denied',
          message: 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.'
        };
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return {
          ok: false,
          reason: 'no-camera',
          message: 'Kamera tidak ditemukan di perangkat Anda.'
        };
      }
      if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
        return {
          ok: false,
          reason: 'in-use',
          message: 'Kamera sedang digunakan oleh aplikasi lain atau sistem mengalami konflik.'
        };
      }
      return {
        ok: false,
        reason: 'unknown',
        message: fallbackErr.message || 'Gagal menyalakan kamera. Coba muat ulang browser.'
      };
    }
  }

  currentStream = stream;

  // 6. Bind to video element if provided
  if (videoElement) {
    try {
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('webkit-playsinline', '');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('autoplay', '');
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.autoplay = true;

      videoElement.srcObject = stream;

      // Wait for loadedmetadata then play
      await new Promise((resolve) => {
        if (videoElement.readyState >= 1) {
          resolve();
        } else {
          videoElement.onloadedmetadata = () => resolve();
          // Timeout safety
          setTimeout(resolve, 800);
        }
      });

      await videoElement.play().catch(playErr => {
        console.warn('Video play was rejected or interrupted:', playErr);
      });
    } catch (bindErr) {
      console.warn('Error binding stream to video element:', bindErr);
    }
  }

  return {
    ok: true,
    stream
  };
}
