# Dashboard LMS Unindra (lokal)

Dashboard pribadi untuk data dari akun LMS sendiri. Login dilakukan manual di Chromium; CAPTCHA tidak dilewati dan password tidak disimpan oleh aplikasi.

Nama aplikasi **RuangKelas**. Kontrak tipe berada di `src/types/lms.ts`, dengan akses data terpusat di `src/lib/data.ts`. File `data/mock/` disimpan sebagai contoh pengembangan, tetapi tidak ditampilkan di dashboard.

## Persiapan

```bash
npm install
npx playwright install chromium
```

## Simpan sesi login

```bash
npm run login
```

Jendela Chromium akan terbuka di halaman login LMS. Login dan isi CAPTCHA secara manual. Setelah berhasil diarahkan ke `/member`, cache akun lokal sebelumnya dibersihkan, sesi disimpan ke `auth.json`, lalu sinkronisasi data akun baru dimulai otomatis. Tunggu status "Data akun tersinkron" sebelum memakai dashboard. Alternatifnya jalankan `npm run scrape` untuk sinkronisasi manual.

Jaga `auth.json` seperti kredensial: jangan dibagikan atau dimasukkan ke Git. Data live lokal hanya ditampilkan saat `auth.json` tersedia. Untuk berganti akun, jalankan ulang perintah login; cache live lama dibersihkan setelah login baru terverifikasi, lalu scraper otomatis mengambil data akun baru. Tombol Keluar menghapus sesi dan cache lokal, bukan data di LMS.

## Jalankan aplikasi

```bash
npm run dev
```

Buka alamat lokal yang ditampilkan Next.js. Jalankan `npm run scrape` untuk memperbarui profil, mata kuliah, jadwal, presensi, materi pertemuan, dan tugas dari LMS. Scraper memproses halaman pertemuan satu per satu dengan jeda dan hanya request GET. Jika daftar URL pertemuan lokal belum ada, jalankan `npm run dump -- --crawl-nav` terlebih dahulu.

## Deployment publik

Saat tidak ada sesi lokal aktif, aplikasi hanya menampilkan halaman login dan tidak menampilkan data contoh. Build produksi menampilkan halaman informasi login lokal; endpoint login, logout, dan sinkronisasi dinonaktifkan. Cache `data/live/` hanya dibaca secara lokal jika sidik sesi cocok dengan sesi yang menghasilkan cache tersebut.

Jangan unggah `auth.json`, `data/raw/`, atau `data/live/` ke hosting/repository. File tersebut dikecualikan oleh `.gitignore`. Untuk demo UI, deploy build Next.js standar; ini tidak menghubungkan pengunjung ke LMS dan tidak menampilkan data akun lokal.

Jika nantinya ingin memberi tiap mahasiswa akses data mereka sendiri, diperlukan autentikasi aplikasi dan penyimpanan terisolasi per pengguna. Jangan memakai satu `auth.json` bersama di server publik.

## Halaman dashboard

- `/` ringkasan kelas, jadwal hari ini, dan tugas terdekat.
- `/matkul` daftar mata kuliah; buka kartu untuk detail materi, pertemuan, dan tugas.
- `/tugas` daftar tugas dengan filter status dan pencarian.
- `/jadwal` jadwal mingguan dengan pemilihan hari di layar kecil.

Tema mengikuti pengaturan sistem dan bisa diubah dari tombol tema. Setelah login LMS lokal berhasil dan sinkronisasi selesai, dashboard membaca cache JSON akun dari `data/live/`.
