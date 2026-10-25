# 📸 PHOTO-US — Neo Brutalism Photobooth

Web photobooth bertema **Neo Brutalism** yang berjalan langsung di browser HP maupun komputer. Ambil foto dari kamera atau unggah dari galeri, pilih filter live, padukan dengan frame custom, lalu simpan hasilnya sebagai PNG.

> Semua proses — kamera, filter, frame, dan export — terjadi secara lokal di browser. Foto tidak dikirim ke server.

---

## ✨ Fitur

### 📷 Kamera & sesi foto

- Tombol **MULAI KAMERA** yang dipicu langsung oleh pengguna, sehingga prompt izin kamera Safari/iOS muncul dengan benar.
- Dukungan kamera depan dan belakang.
- Mode mirror untuk preview dan hasil jepretan.
- Hitung mundur 3 detik, flash, dan suara kamera.
- Sesi multi-shot: jumlah foto mengikuti frame yang dipilih. Kontrol menampilkan opsi 1, 2, 3, 4, dan 6; opsi yang tidak didukung frame otomatis nonaktif.
- Retake satu slot tanpa menghapus foto lain.
- Fallback **UPLOAD** dari galeri jika kamera tidak tersedia atau izin ditolak.
- Panel diagnostik kamera tersembunyi lewat `?debug=1`.

### 🪄 10 filter live WYSIWYG

Filter diproses secara real-time dan hasil jepretan dibuat dari frame kamera beresolusi tinggi, bukan dari preview kecil.

1. **Original** — tanpa pemrosesan.
2. **Vivid** — saturasi dan kontras lebih kuat.
3. **Vivid Warm** — vivid dengan white balance lebih hangat.
4. **Vivid Cool** — vivid dengan white balance lebih dingin.
5. **Dramatic** — kontras tinggi, bayangan lebih dalam.
6. **Dramatic Warm** — dramatic dengan tint hangat.
7. **Dramatic Cool** — dramatic dengan tint dingin.
8. **Mono** — hitam-putih netral.
9. **Silvertone** — hitam-putih lembut dengan tint silver.
10. **Noir** — hitam-putih kontras tinggi.

Pipeline filter memakai WebGL dengan fallback Canvas 2D.

### 🖼️ Frame custom

Saat ini aplikasi memakai **4 frame PNG custom** dari `public/frames/`:

| Frame | Jumlah foto | File |
|---|---:|---|
| Dark Blue | 1 | `public/frames/dark-blue/1.png` |
| Polca Maroon | 2 | `public/frames/polca-maroon/2.png` |
| Retro Film | 3 | `public/frames/retro-film/3.png` |
| Basic Polca | 4 | `public/frames/basic-polca/4.png` |

Frame dipilih lewat modal picker. Setiap frame memiliki slot foto transparan dan metadata posisi di `meta.json`.

> 9 frame prosedural lama masih tersimpan di `src/frames/frames.js`, tetapi sengaja dinonaktifkan (`ENABLE_BUILTIN_FRAMES = false`). Yang aktif di aplikasi adalah frame PNG custom di atas.

### 🎛️ Studio & hasil

- Preview hasil akhir langsung di canvas.
- Ganti frame setelah foto diambil.
- Tambah foto ke slot yang masih kosong dari galeri.
- Retake satu slot atau ambil ulang seluruh sesi.
- Editor caption hingga 30 karakter dengan textarea yang menyesuaikan tinggi layar.
- Export PNG resolusi tinggi dengan progress dan toast.

> **Catatan:** renderer frame PNG saat ini belum menggambar caption/tanggal ke hasil export. Kolom caption tetap tersedia di UI Studio; overlay tersebut perlu ditambahkan ke pipeline `src/frames/frames.js` jika dibutuhkan.

### 🎨 UI/UX

- Tema **Neo Brutalism**: cream, garis hitam tebal, hard shadow, kartu rounded, dan aksen pink, ungu, teal, kuning.
- Tipografi Archivo Black, Space Grotesk, dan Space Mono.
- Responsif untuk layar kecil, termasuk kontrol minimal 44px.
- Filter rail dapat di-scroll horizontal tanpa membuat halaman ikut melebar.
- Fokus keyboard, `aria-label`, dialog modal, focus trap, dan `prefers-reduced-motion`.
- Efek suara Web Audio untuk klik, hitung mundur, shutter, dan fanfare.
- Pilihan filter, frame, dan jumlah shot disimpan di `localStorage`.
- Tombol **ACAK** memilih filter dan frame yang kompatibel dengan jumlah shot saat ini.

---

## 🚀 Menjalankan secara lokal

### Prasyarat

- Node.js **22.x** (lihat `package.json`)
- npm

```bash
git clone https://github.com/Bentarraya/photo-us.git
cd photo-us
npm install
npm run dev
```

Buka URL yang tertera di terminal. Biasanya:

- `http://localhost:5173/` jika sertifikat lokal tidak ada
- `https://localhost:5173/` jika `certs/key.pem` dan `certs/cert.pem` tersedia

### HTTPS untuk kamera di iPhone/iPad

Kamera browser membutuhkan **secure context**. `localhost` dianggap aman, tetapi akses lewat IP LAN harus memakai HTTPS.

1. Siapkan sertifikat lokal:
   - `certs/key.pem`
   - `certs/cert.pem`
2. Jalankan:
   ```bash
   npm run dev
   ```
3. Buka alamat HTTPS Network yang ditampilkan Vite dari iPhone, misalnya:
   ```text
   https://192.168.1.xxx:5173/
   ```
4. Terima peringatan sertifikat self-signed satu kali di Safari.

`npm run dev:https` tersedia sebagai alias perintah yang sama. HTTPS aktif otomatis berdasarkan keberadaan file sertifikat di `certs/`; folder tersebut tidak ikut di-commit.

### Perintah lain

```bash
npm run build      # build produksi ke dist/
npm run preview    # preview hasil build
node scripts/build-frames-index.mjs  # regenerate public/frames/index.json
```

`npm run dev` dan `npm run build` otomatis menjalankan script pemindaian frame terlebih dahulu.

---

## 🧩 Menambah frame baru

Frame dibaca dari folder `public/frames/<id-frame>/`.

1. Buat folder, misalnya:
   ```text
   public/frames/frame-baru/
   ```
2. Tambahkan PNG frame. Nama file menentukan jumlah foto yang didukung:
   ```text
   public/frames/frame-baru/2.png
   public/frames/frame-baru/4.png
   ```
   Artinya frame tersebut mendukung 2 dan 4 foto.
3. Area foto harus transparan. Renderer akan menempatkan foto di balik PNG frame.
4. Tambahkan `meta.json`:
   ```json
   {
     "name": "Frame Baru",
     "defaultShots": 2,
     "order": 5,
     "slots": {
       "2": [
         { "x": 120, "y": 180, "w": 360, "h": 480 },
         { "x": 120, "y": 700, "w": 360, "h": 480 }
       ]
     }
   }
   ```
   Koordinat `slots` memakai ukuran asli PNG frame.
5. Jalankan `npm run dev` atau `npm run build` untuk memperbarui `public/frames/index.json`.
6. Frame baru akan muncul di picker.

Opsi tambahan yang didukung renderer:

- `fit`: `"cover"` (default) atau `"contain"`
- `matte`: warna latar saat mode `contain`
- `underlay.png` atau `underlay.jpg`: gambar di bawah foto
- `order`: urutan tampil di picker

Detail implementasi ada di `src/frames/frames.js` dan `scripts/build-frames-index.mjs`.

---

## ☁️ Build & deploy ke Vercel

Proyek sudah memiliki `vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Langkah deploy:

1. Import repository `Bentarraya/photo-us` di [vercel.com/new](https://vercel.com/new).
2. Framework terdeteksi sebagai **Vite**.
3. Pastikan build command `npm run build` dan output directory `dist`.
4. Gunakan Node.js 22 sesuai `package.json`.
5. Tidak ada environment variable yang wajib diisi.
6. Deploy.

Vercel menyediakan HTTPS otomatis, sehingga kamera dapat dipakai setelah aplikasi terpasang, dengan izin kamera dari pengguna.

---

## 🗂️ Struktur proyek

```text
src/
  App.jsx                 # shell, state filter/frame/shots, modal panduan
  components/
    CameraView.jsx        # kamera, filter, upload, capture, retake
    StudioView.jsx        # preview, slot, caption, export, toast
    FramePicker.jsx       # modal pemilih frame
  camera/startCamera.js   # akses kamera dan pesan error
  filters/                # preset dan pipeline filter
  frames/                 # renderer frame + frame prosedural (nonaktif)
  styles/neo-brutalism.css
  utils/sound.js
public/frames/            # PNG + meta.json frame custom
scripts/build-frames-index.mjs
```

---

## 🔧 Debug & troubleshooting

### Kamera tidak muncul

- Pastikan halaman dibuka lewat `https://` atau `localhost`, bukan IP LAN HTTP.
- Buka langsung di Safari/Chrome, bukan browser dalam aplikasi Instagram/TikTok/WhatsApp.
- Cek izin kamera di pengaturan browser.
- Buka `?debug=1` untuk melihat status secure context, stream, dan error kamera.

### Frame tidak muncul

- Pastikan folder berada di `public/frames/`.
- Pastikan ada file PNG dengan nama angka, misalnya `1.png`.
- Jalankan `node scripts/build-frames-index.mjs` atau restart `npm run dev`.
- Periksa `public/frames/index.json`.

### Caption tidak terlihat di hasil

- Ini adalah keterbatasan renderer frame PNG saat ini; caption baru tersedia sebagai field editor di Studio.

### Debug frame

Tambahkan `?debugframes=1` saat berada di Studio untuk melihat overlay slot frame pada preview.

---

## 🛠️ Teknologi

- React 18
- Vite 7
- Tailwind CSS 4
- Canvas 2D + WebGL untuk filter dan komposisi frame
- Lucide React untuk ikon
- Web Audio API untuk efek suara
- Vercel untuk deployment

---

## 📄 Lisensi

Belum ada file lisensi eksplisit di repository ini. Tambahkan `LICENSE` jika proyek akan didistribusikan atau digunakan ulang secara publik.
