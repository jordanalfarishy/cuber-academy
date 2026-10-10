# Cuber

Cuber adalah web app untuk mempelajari Rubik 3×3 dengan kubus 3D interaktif. Ada dua mode yang bisa dipilih dari bagian atas halaman: **Belajar** untuk mengikuti panduan, dan **Simulator** untuk mencari solusi dari Rubik fisik yang sudah teracak.

## Fitur

- **Belajar:** delapan langkah dari dasar dan notasi hingga lapisan terakhir. Setiap langkah memiliki penjelasan, gerakan latihan, dan kubus 3D yang bisa diputar.
- **Simulator:** isi warna 54 kotak sesuai Rubik fisik, termasuk warna pusat tiap sisi. Aplikasi memeriksa apakah susunannya mungkin terjadi pada Rubik 3×3, lalu menampilkan urutan putaran dan memperagakannya pada kubus 3D.
- Jika arah kisi suatu sisi berbeda saat warna disalin, simulator mencoba menyesuaikannya otomatis. Tombol **Putar arah isian sisi** juga tersedia untuk mengubah arah kisi secara manual.
- Progres belajar dan warna yang diisi tersimpan di browser melalui `localStorage`. Perhitungan solusi berjalan di perangkat pengguna.

## Menjalankan secara lokal

Proyek ini berupa HTML, CSS, dan JavaScript statis. Tidak ada paket yang perlu dipasang atau proses build.

Jalankan server lokal dari direktori proyek:

```bash
python3 -m http.server 8000 --directory dist
```

Lalu buka [http://localhost:8000](http://localhost:8000). Gunakan server lokal agar mesin solusi berbasis Web Worker dapat dimuat secara konsisten.

## Menggunakan simulator

1. Tentukan sisi atas (**U**) dan depan (**F**) pada Rubik fisik, lalu pertahankan acuan itu saat berpindah sisi.
2. Pilih sisi **U, R, F, D, L,** atau **B**, pilih warna, lalu isi sembilan kotaknya sesuai Rubik. Warna pusat dapat diubah.
3. Setelah keenam sisi terisi, pastikan setiap warna berjumlah sembilan kotak dan tekan **Cari solusi Rubik saya**.
4. Ikuti urutan gerakan yang muncul. Gunakan kontrol langkah pada pratinjau 3D untuk melihat tiap putaran.

Untuk mencoba tanpa Rubik fisik, tekan **Isi contoh acak** di mode Simulator.

## Pengujian

Jika Node.js tersedia, jalankan:

```bash
node --test tests/cube-state.test.js
```

Pengujian mencakup gerakan kubus, pemeriksaan susunan yang tidak mungkin, penyesuaian arah sisi, dan penyelesaian contoh Rubik.

## Struktur proyek

| Lokasi | Isi |
| --- | --- |
| `dist/index.html`, `dist/style.css` | Tampilan aplikasi |
| `dist/app.js`, `dist/mode.js` | Panduan belajar dan pemilihan mode |
| `dist/real-cube.js`, `dist/cube-state.js`, `dist/solve-worker.js` | Input Rubik fisik, validasi, dan pencarian solusi |
| `dist/vendor/` | Pustaka Cube.js dan berkas lisensinya |
| `tests/` | Pengujian logika Rubik |

Pustaka Cube.js yang disertakan memiliki ketentuan lisensi pada [`dist/vendor/LICENSE-cubejs.txt`](dist/vendor/LICENSE-cubejs.txt).
