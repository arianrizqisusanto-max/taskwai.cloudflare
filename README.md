<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/60ab5c0b-950b-4390-baf0-2038b8f1b076

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 🚀 Cloudflare Pages Deployment & Cache Protection

Aplikasi ini dideploy menggunakan **Cloudflare Pages** dengan konfigurasi khusus untuk mencegah masalah layar putih kosong (*blank white screen / MIME Type Mismatch*) yang sering terjadi saat pembaruan kode. Informasi berikut sangat penting untuk dibaca oleh **AI Asisten** atau pengembang yang melanjutkan proyek ini:

### 1. Konfigurasi Header & Redirect (`public/`)
Di dalam folder `public/`, terdapat dua file konfigurasi penting untuk Cloudflare Pages:
*   [public/_headers](file:///d:/lain%20lain/taskwai.CF/public/_headers): Menginstruksikan CDN Cloudflare dan browser untuk **tidak melakukan cache** pada `index.html` (`Cache-Control: no-cache, no-store, must-revalidate`). Ini memastikan pengguna selalu mendapatkan HTML terbaru yang merujuk ke hash JavaScript terbaru.
*   [public/_redirects](file:///d:/lain%20lain/taskwai.CF/public/_redirects): Berisi aturan routing SPA (`/* /index.html 200`) dan aturan **rewrite mapping** untuk mereturn JavaScript jika browser salah meminta separator karakter (seperti memetakan file dengan pemisah underscore ke dash).

> [!IMPORTANT]
> **DILARANG MENGHAPUS** file `_headers` dan `_redirects` di folder `public/` karena akan merusak sistem caching dan perutean di server Cloudflare.

### 2. Sistem Pemulihan Layar Putih (Graceful Recovery)
Di dalam [index.html](file:///d:/lain%20lain/taskwai.CF/index.html), terdapat script inline di bagian `<head>`:
*   **Global Error Listener**: Mendeteksi jika ada file script atau CSS utama yang gagal dimuat (misalnya, karena CDN atau browser memuat file lama yang sudah dihapus dari server).
*   **Tombol Muat Ulang (`forceRecovery`)**: Jika terjadi kegagalan pemuatan, sistem tidak akan menampilkan layar putih polos melainkan memunculkan jendela hitam darurat dengan tombol **"Muat Ulang"**. Tombol ini akan otomatis meng-unregister seluruh Service Worker dan menghapus seluruh Cache Storage di browser pengguna sebelum melakukan reload.

### 3. Cara Memaksa Pembaruan Cache (Bypass Cache)
Jika setelah deploy baru pengguna masih mendapati tampilan lama atau tertahan di layar recovery karena cache CDN Cloudflare yang sangat agresif:
1.  **Paksa Perubahan Hash File**: Tambahkan/ubah nilai string pada baris `console.log` di dalam [src/main.tsx](file:///d:/lain%20lain/taskwai.CF/src/main.tsx) (misal mengubah timestamp-nya). Modifikasi pada kode aktif ini akan memaksa Vite menghasilkan hash file baru (misal: `index-CADRJDy3.js`), yang secara otomatis mem-bypass seluruh cache CDN.
2.  **Gunakan Query Bypass**: Buka web menggunakan parameter versi baru seperti `https://taskwai.com/?v=X` untuk melewati cache edge Cloudflare secara instan.
