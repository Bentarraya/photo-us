# 📸 PHOTO-US — Pixel Art Photobooth Web App

Web app Photobooth bertema **Pixel Art 8-bit** retro dengan **14 Live Filter WYSIWYG** dan **9 Frame Prosedural** unik yang dapat dijalankan langsung di browser Handphone (HP) maupun Komputer (PC/Laptop). Cocok untuk sesi foto seru dan romantis bersama pasangan ataupun teman!

---

## ✨ Fitur Baru & Peningkatan (Spec v2.0)

### 1. 📷 Perbaikan Kamera Komprehensif (iOS & macOS Safari Ready)
- **Tombol Mulai Kamera (User Gesture)**: Safari pada iPhone dan Mac membatasi akses kamera otomatis tanpa interaksi pengguna. Tombol *"MULAI KAMERA"* memastikan *prompt* izin kamera selalu muncul.
- **Dukungan HTTPS Dev (@vitejs/plugin-basic-ssl)**: Jalankan `npm run dev:https` untuk menguji kamera di iPhone melalui jaringan lokal tanpa kendala izin *insecure context*.
- **Pesan Panduan Platform-Spesifik**: Jika kamera tertolak atau terblokir, aplikasi menampilkan langkah membuka izin langsung untuk iOS Safari, Mac Safari, maupun Chrome.
- **Panel Diagnostik Tersembunyi**: Buka dengan parameter `?debug=1` (misal: `http://localhost:5173/?debug=1`) untuk melihat status kamera, resolusi stream, dan informasi lingkungan secara real-time.

---

### 2. 🪄 14 Filter Live Real-Time (WYSIWYG)
Tampilan live kamera langsung menerapkan efek filter pilihan, dan hasil jepretan foto 100% identik dengan yang dilihat di layar (*What You See Is What You Get*):
1. **Original** 📷: Tanpa pemrosesan.
2. **Vintage Warung** 📼: Sepia vintage, vignette lembut, dan *film grain*.
3. **Y2K Glitter** ✨: Saturasi cerah, gradient wash pink/cyan, dan taburan bintang berkilau.
4. **Cyber Neon** 🌃: Split kanal warna RGB (chromatic aberration) dan scanlines horizontal.
5. **Polaroid Fade** 🎞️: Kontras retro film pudar dengan efek *light leak* jingga di tepi foto.
6. **Noir Drama** 🎬: Hitam-putih kontras tinggi dengan vignette dramatis dan butiran film.
7. **Pixel 8-bit** 👾: Efek pixel art arcade retro dengan kuantisasi warna 4 level.
8. **Comic Pop** 💥: Posterisasi warna buku komik dengan pola bintik *halftone*.
9. **Thermal Cam** 🔥: Peta gradien termal panas (Hitam → Ungu → Merah → Oranye → Kuning → Putih).
10. **VHS Glitch** 📺: Distorsi pita kaset VHS periodik, split warna, scanlines, dan cap "● REC" + running time.
11. **Dreamy Glow** 🌸: Efek pendaran cahaya lembut berselimut warna pastel.
12. **Mirror Twin** 🪞: Refleksi simetris wajah kiri ke kanan.
13. **Fisheye Lol** 🐟: Distorsi cembung lensa fisheye lucu.
14. **Party Mode** 🎉: Taburan konfeti warna-warni yang berjatuhan dan emoji pesta animasi.

---

### 3. 🖼️ 9 Frame Prosedural (100% Canvas Code)
Seluruh frame digambar langsung menggunakan kode (Canvas 2D) tanpa ketergantungan aset gambar luar berhak cipta:
1. **Classic Strip 🖤** (*strip-4*): Strip 4 foto putih minimalis elegan.
2. **Film Roll 🎞️** (*strip-3*): Desain klise roll film hitam dengan lubang *sprocket* dan nomor frame "1A", "2A".
3. **Polaroid 🤍** (*single*): Kartu polaroid putih gading dengan margin bawah lebar dan tulisan cursive.
4. **Kawaii Pastel 🍡** (*strip-3*): Gradasi pastel pink-lavender-mint dengan sudut foto melengkung dan hiasan hati/bintang.
5. **Y2K Chrome 💿** (*strip-4*): Gradasi perak metalik, garis scan cyber, dan bingkai krom mengkilap.
6. **Comic Panel 💬** (*grid-2x2*): Format kolase komik kuning bertabur gelembung dialog lucu.
7. **Receipt Era 🧾** (*strip-3*): Kertas struk belanja kasir dengan gerigi potongan kertas dan barcode.
8. **Neon Sign 🌙** (*single*): Latar gelap dengan pendaran neon glow cyan & hot-pink terang.
9. **Batik Kondangan 🇮🇩** (*single*): Motif geometris kawung elegan warna cokelat keemasan khas nusantara.

---

### 4. 🎛️ Fitur Tambahan
- **Surprise Me 🎲**: Tombol acak untuk memilihkan kombinasi filter dan frame terbaik secara instan.
- **Penyimpanan Pilihan**: Filter dan frame terakhir disimpan otomatis di `localStorage`.
- **Edit Teks & Format Tanggal**: Bebas mengubah nama/caption pasangan dan cap tanggal format Indonesia (`DD MMM YYYY`).
- **Download & Share**: Unduh PNG beresolusi tinggi dengan pesta confetti atau bagikan melalui Web Share API.

---

## 🚀 Cara Menjalankan

### Mode Standar (HTTP):
```bash
cd photo-us
npm run dev
```
Buka `http://localhost:5173` di browser.

### Mode HTTPS (Disarankan untuk testing di iPhone/iPad Safari via Wi-Fi):
```bash
cd photo-us
npm run dev:https
```
Buka alamat Network HTTPS yang tertera di terminal dari iPhone (misal: `https://192.168.1.xxx:5173`). Terima peringatan sertifikat mandiri (*self-signed certificate*) satu kali di browser HP untuk mengizinkan kamera Safari.
