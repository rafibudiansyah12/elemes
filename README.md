# elemes — Dashboard LMS Unindra

Dashboard akademik pribadi untuk data dari akun LMS sendiri. Login dilakukan manual di Chromium; CAPTCHA tidak dilewati dan password tidak disimpan oleh aplikasi.

Nama aplikasi **RuangKelas**. Kontrak tipe berada di `src/types/lms.ts`, dengan akses data terpusat di `src/lib/data.ts`. Dashboard tidak menyertakan data demo; sebelum sesi LMS aktif dan data berhasil dibaca, halaman menampilkan keadaan kosong.

## Persiapan

```bash
npm install
npx playwright install chromium
```

## Simpan sesi login

```bash
npm run login
```

Jendela Chromium akan terbuka di halaman login LMS. Login dan isi CAPTCHA secara manual. Setelah berhasil diarahkan ke `/member`, cache akun lokal sebelumnya dibersihkan, sesi disimpan ke `auth.json`, lalu sinkronisasi data akun baru dimulai otomatis. Tunggu status data tersinkron sebelum memakai dashboard. Alternatifnya jalankan `npm run scrape` untuk sinkronisasi manual.

Jaga `auth.json` seperti kredensial: jangan dibagikan atau dimasukkan ke Git. Cache live hanya ditampilkan jika sidik sesi cocok dengan sesi yang membuatnya. Untuk berganti akun, jalankan ulang perintah login; cache sebelumnya dibersihkan. Tombol Keluar menghapus sesi dan cache lokal, bukan data di LMS.

## Jalankan aplikasi

```bash
npm run dev
```

Buka alamat lokal yang ditampilkan Next.js. Scraper membaca profil, mata kuliah, jadwal, presensi, materi pertemuan, dan tugas secara berurutan dengan jeda minimal satu detik dan hanya request GET. Jika daftar URL pertemuan lokal belum tersedia, jalankan `npm run dump -- --crawl-nav` untuk discovery.

## Deployment publik

Deployment Railway meneruskan form username/password/CAPTCHA ke halaman login LMS resmi melalui HTTPS, lalu membaca halaman LMS dengan GET. Kode tidak menulis password, cookie sesi, atau hasil scrape ke file/database; cookie jar dan snapshot hanya disimpan dalam memori proses dan dihapus saat logout atau proses berhenti. Karena sesi berada di RAM, gunakan satu replica agar request pengguna kembali ke proses yang sama. Railway restart atau deployment akan meminta pengguna login lagi. Scraper hanya membaca; pengiriman tugas dan perubahan data tetap dilakukan di LMS.

Untuk deploy: hubungkan repo GitHub `rafibudiansyah12/elemes` ke Railway. Railpack mendeteksi Next.js dari `package.json`; build menggunakan `npm run build` dan start menggunakan `npm run start`. Buat public domain pada service. Jangan menambahkan `auth.json` atau kredensial LMS sebagai Railway variables.

Catatan: backend relai memproses kredensial dan cookie sementara untuk meneruskan autentikasi. Jangan gunakan layanan ini sebelum memastikan kebijakan LMS mengizinkan relai seperti ini dan sebelum meninjau praktik keamanan untuk penggunaan banyak mahasiswa.

Jangan unggah `auth.json`, `data/raw/`, atau `data/live/` ke repository atau hosting. File tersebut dikecualikan oleh `.gitignore`. Untuk memberi tiap mahasiswa akses data mereka sendiri, diperlukan integrasi LMS resmi serta autentikasi dan penyimpanan yang terisolasi per pengguna. Jangan memakai satu `auth.json` bersama di server publik.

## Halaman dashboard

- `/` ringkasan kelas, jadwal hari ini, dan tugas terdekat.
- `/matkul` daftar mata kuliah; buka kartu untuk detail materi, pertemuan, dan tugas.
- `/tugas` daftar tugas dengan filter status dan pencarian.
- `/jadwal` jadwal mingguan dengan pemilihan hari di layar kecil.
- `/presensi` rekap presensi mata kuliah.

Tema mengikuti pengaturan sistem dan bisa diubah dari tombol tema. Setelah login LMS lokal dan sinkronisasi selesai, dashboard membaca cache JSON akun dari `data/live/`.
