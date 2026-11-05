# Penjelasan Perubahan UI dan Fitur TBCatch

Dokumen ini merangkum perbaikan antarmuka dan penambahan fitur pada prototipe TBCatch. Pengembangan berfokus pada penggunaan melalui ponsel, kejelasan tahapan pemeriksaan, dan kemudahan meninjau tampilan tanpa model terlatih. Penjelasan mengikuti kondisi akhir implementasi, termasuk pilihan warna maroon, krem, dan putih.

## 1. Tujuan Perubahan

Tampilan sebelumnya menempatkan informasi pengenalan dan formulir pemeriksaan dalam halaman panjang. Urutan langkah belum menunjukkan secara jelas bahwa kuesioner masih diperlukan sebelum hasil akhir. Pada layar ponsel, instruksi dan tombol tindakan juga dapat berada pada posisi yang berjauhan.

Perubahan diarahkan untuk membantu pengguna memahami apa yang perlu dilakukan, mengetahui posisi mereka dalam proses, dan menjangkau tombol utama dengan lebih mudah. Identitas visual diperjelas melalui ilustrasi paru-paru dan unsur pemeriksaan kesehatan.

## 2. Perbaikan Tampilan

### 2.1. Warna dan Identitas Visual

Palet akhir menggunakan maroon pekat sebagai aksen utama, dipadukan dengan krem dan putih. Maroon ditonjolkan pada bagian pembuka, bagian ajakan memulai di akhir beranda, tombol, dan bilah atas pemeriksaan. Area informasi serta formulir tetap menggunakan latar terang agar teks mudah dibaca.

Warna hitam tidak digunakan sebagai latar dominan. Aksen hijau dan teal dari rancangan sebelumnya juga sudah diganti, termasuk pada ilustrasi dan grafik denyut. Ketiga kotak ilustrasi pada bagian **Tenang sejenak**, **Rekam batukmu**, dan **Ceritakan gejalanya** kini sama-sama menggunakan latar maroon.

Judul utama beranda menjadi **“Kenali TB. Mulai peduli.”** untuk memperjelas konteks tuberkulosis. Huruf serif digunakan pada judul, sedangkan instruksi, formulir, dan tombol menggunakan huruf sans-serif agar tetap mudah dibaca.

### 2.2. Beranda dan Pemeriksaan Dipisahkan Secara Visual

Beranda memuat pengenalan TBCatch, panduan langkah, pertanyaan umum, dan tombol memulai pemeriksaan. Ketika pengguna memilih tombol mulai, bagian beranda disembunyikan dan layar pemeriksaan ditampilkan.

Pemisahan ini masih berada dalam satu dokumen web, dengan penanda alamat `#check`; bukan aplikasi atau halaman server yang terpisah. Tujuannya agar pengguna dapat berfokus pada pemeriksaan tanpa harus melewati bagian promosi dan penjelasan berulang kali.

### 2.3. Ilustrasi dan Ikon SVG Baru

Lima ilustrasi utama diganti dengan aset SVG orisinal yang dapat diperbesar dan diedit sebagai vektor:

| Ilustrasi | Fungsi | Berkas |
| --- | --- | --- |
| Paru-paru dan pemeriksaan melalui ponsel | Memperjelas tema TB pada beranda | `tb-lungs-care.svg` |
| Ponsel dengan indikator denyut | Menjelaskan tahap pengukuran denyut | `tb-pulse-phone.svg` |
| Seseorang menutup batuk dengan tisu | Mendukung penjelasan perekaman batuk | `tb-cough-care.svg` |
| Lembar pemeriksaan kesehatan | Mendukung tahap kuesioner | `tb-health-check.svg` |
| Posisi jari pada kamera belakang | Membantu pengguna mengikuti instruksi kamera | `tb-camera-grip.svg` |

Selain itu, tersedia 14 simbol SVG untuk paru-paru, denyut, mikrofon, kuesioner, perisai, arah navigasi, unduhan, perekaman, penghentian, tanda centang, dan penutupan. Simbol tersebut disimpan dalam `health-icons.svg`. Favicon juga menggunakan bentuk paru-paru.

Seluruh aset berada di [prototype/static/assets](prototype/static/assets/). Ilustrasi ini merupakan alat bantu visual, bukan gambar diagnosis atau bukti kondisi paru-paru pengguna.

### 2.4. Penyesuaian untuk Layar Ponsel

Tata letak menyesuaikan lebar layar. Pada ponsel, formulir menggunakan satu kolom dan tombol utama ditempatkan dalam area tetap di bagian bawah layar. Tombol tersebut mengikuti tahap yang sedang aktif, misalnya **Mulai ukur denyut**, **Lanjut ke pertanyaan**, atau **Lihat hasil pemeriksaan**.

Ukuran tombol utama dibuat cukup besar untuk disentuh, dengan tinggi minimal 52 piksel. Area tombol mempertimbangkan ruang aman di bawah layar. Pengaturan *reduced motion* tetap dihormati agar pengguna yang membatasi animasi tidak harus melihat transisi gerak.

### 2.5. Bahasa dan Pesan Antarmuka

Bahasa Indonesia menjadi bahasa utama pada beranda, tahapan pemeriksaan, pertanyaan kesehatan, dan pesan kondisi pengukuran. Pesan dibuat lebih langsung, misalnya instruksi menahan posisi jari, penjelasan izin kamera ditolak, dan pemberitahuan bahwa rekaman belum siap.

Perubahan ini belum mencakup pilihan dua bahasa. Sebagian pesan pada jalur demo model lama dan pesan yang berasal dari server masih dapat menggunakan bahasa Inggris.

## 3. Perbaikan Alur dan Interaksi

### 3.1. Empat Tahap yang Lebih Jelas

Urutan pemeriksaan ditampilkan sebagai:

**Denyut → Batuk → Gejala → Hasil**

Tahap kuesioner kini memiliki layar sendiri, sehingga pengguna tidak mengira bahwa hasil akhir sudah tersedia setelah merekam batuk. Indikator **“Langkah … dari 4”**, penanda tahap aktif, dan tombol kembali membantu pengguna mengetahui posisi mereka dalam proses.

Navigasi memeriksa kelengkapan masukan sebelum membuka tahap berikutnya. Dalam mode model, analisis awal batuk dan denyut dilanjutkan dengan kuesioner sebelum hasil akhir ditampilkan. Perubahan ini mengatur penyajian alur, bukan mengubah aturan model menjadi skrining tanpa kuesioner.

### 3.2. Penyajian Pengukuran dan Perekaman

Layar denyut menempatkan ilustrasi posisi jari, instruksi singkat, angka BPM, gelombang sinyal, dan progres pengukuran dalam susunan yang lebih ringkas. Pesan selama pengukuran menjelaskan apakah sinyal sedang dicari, belum stabil, atau sudah cukup untuk melanjutkan. Angka yang muncul sebelum proses selesai dijelaskan sebagai pembacaan sementara.

Layar batuk menampilkan status mikrofon, durasi rekaman, pilihan unggah, pemutar audio, dan konfirmasi isi rekaman. Perekaman, pengunggahan, dan pemutaran audio sudah tersedia sebelumnya; pembaruan ini menata ulang tampilannya dan menyesuaikan bahasanya.

Ketika pengguna meninggalkan tahap pengambilan data atau menutup tampilan pemeriksaan, kamera dan mikrofon yang sedang digunakan dihentikan. Perilaku penghentian saat halaman tidak aktif dari implementasi sebelumnya juga tetap digunakan.

### 3.3. Kuesioner Lebih Mudah Diisi

Sembilan pertanyaan kesehatan ditampilkan dalam satu kolom. Pertanyaan biner menggunakan pilihan **Ya/Tidak** dengan area sentuh besar, menggantikan menu tarik turun. Kolom usia, lama batuk, dan jenis kelamin tetap menggunakan masukan yang sesuai.

Jawaban dipertahankan ketika pengguna kembali ke langkah sebelumnya dalam sesi halaman yang sama. Jika jawaban berubah setelah hasil tersedia, hasil lama dibatalkan dan unduhan disembunyikan sampai pemeriksaan dijalankan kembali. Jawaban tidak disimpan untuk digunakan kembali setelah halaman dimuat ulang.

### 3.4. Hasil Mengutamakan Makna dan Tindak Lanjut

Tampilan hasil mendahulukan kategori skrining, penjelasan singkat, dan arahan tindak lanjut. Skor model serta ambang keputusan dipindahkan ke bagian **“Lihat rincian hasil”** yang dapat dibuka sesuai kebutuhan.

Keterangan bahwa hasil bukan diagnosis tetap ditampilkan. Skor juga dijelaskan sebagai keluaran model, bukan persentase pasti kemungkinan seseorang memiliki TB. Fitur unduhan ringkasan yang sudah ada tetap digunakan dengan penamaan berkas yang disesuaikan.

## 4. Fitur Baru untuk Pengembangan UI

### 4.1. Mode Pratinjau Tanpa Model

Opsi `-UiOnly` pada peluncur dan `--ui-only` pada server memungkinkan tampilan dibuka tanpa bobot model, dataset, atau library pembelajaran mesin. Mode ini tidak menjalankan persiapan maupun pemuatan model.

Jalankan dari direktori utama proyek:

```powershell
powershell -ExecutionPolicy Bypass -File .\prototype\start.ps1 -UiOnly
```

Jika hanya ingin memakai Python yang tersedia tanpa bergantung pada environment proyek:

```powershell
python .\prototype\server.py --ui-only
```

Buka `http://localhost:8765/`, pilih **Mulai pemeriksaan**, lalu buka panel **Mode pratinjau UI**. Akses kamera dan mikrofon tetap bergantung pada izin serta dukungan browser. Akses dari HP memerlukan pengaturan HTTPS yang sesuai.

### 4.2. Contoh Kondisi Antarmuka

Panel pratinjau menyediakan delapan pilihan:

1. Contoh denyut.
2. Izin kamera ditolak.
3. Sinyal lemah.
4. Contoh rekaman.
5. Rekaman kosong.
6. Contoh kuesioner.
7. Contoh hasil positif.
8. Contoh hasil negatif.

Fitur ini membantu pengembang meninjau tampilan normal maupun tampilan kesalahan tanpa harus menghasilkan kondisi tersebut melalui perangkat nyata. Panel hanya ditampilkan pada mode pratinjau.

### 4.3. Penandaan dan Pemisahan Data Simulasi

Ketika contoh digunakan, aplikasi menampilkan penanda **SIMULASI UI**. Angka denyut, data rekaman, dan hasilnya bersifat fiktif. Contoh tersebut tidak mengirimkan permintaan prediksi ke model.

Masukan pengukuran nyata dinonaktifkan selama sesi simulasi agar kedua jenis data tidak tercampur. Tombol **Keluar simulasi** mengatur ulang sesi sebelum pengguna kembali ke pengambilan data nyata. Ringkasan contoh yang diunduh menggunakan nama berkas `tbcatch-SIMULASI-UI.json` dan menyertakan keterangan bahwa hasil bukan pemeriksaan kesehatan.

## 5. Pemeriksaan yang Telah Dilakukan

Pada proses pengembangan, antarmuka diuji melalui Chrome dengan lebar tampilan 320, 390, 768, dan 1440 piksel. Pemeriksaan mencakup tata letak tanpa pelebaran horizontal, perpindahan tahap, validasi formulir, retensi jawaban saat kembali, kondisi pratinjau, hasil simulasi, unduhan, dan pengaturan ulang sesi.

Alur yang memakai model juga diperiksa menggunakan respons server tiruan. Pemeriksaan tersebut mencakup masukan denyut manual, unggahan WAV sintetis, permintaan analisis awal, pengiriman sembilan jawaban numerik, dan penayangan hasil akhir. Respons tiruan memeriksa hubungan antarmuka dengan server; respons tersebut bukan hasil model TB asli.

Skrip pengujian antarmuka terbaru tersedia di [prototype/tests/ui_mobile.cjs](prototype/tests/ui_mobile.cjs). Skrip `design.cjs` dan `e2e.cjs` yang lebih lama masih mengacu pada antarmuka Inggris dengan tiga tahap.

## 6. Batasan dan Cakupan Perubahan

Pembaruan ini mencakup tampilan, navigasi, interaksi formulir, penyajian hasil, dan sarana pratinjau untuk pengembangan UI. Algoritma penelitian, bobot model, kalibrasi, dan ambang keputusan tidak diubah.

Pemeriksaan browser belum membuktikan kenyamanan penggunaan pada semua ponsel, kompatibilitas Safari, akurasi denyut kamera, atau performa klinis. Prediksi menggunakan model asli tetap membutuhkan aset model yang sesuai. Mode pratinjau hanya memungkinkan pekerjaan UI dilakukan tanpa aset tersebut.

## 7. Berkas Utama

| Berkas | Peran dalam pembaruan |
| --- | --- |
| [prototype/static/index.html](prototype/static/index.html) | Struktur beranda, empat tahap pemeriksaan, dan panel pratinjau |
| [prototype/static/style.css](prototype/static/style.css) | Warna, tipografi, tata letak beranda, dan kotak ilustrasi maroon |
| [prototype/static/check.css](prototype/static/check.css) | Tampilan pemeriksaan, formulir, tombol bawah, dan hasil |
| [prototype/static/app.js](prototype/static/app.js) | Navigasi, interaksi formulir, penyajian hasil, dan contoh UI |
| [prototype/static/assets/](prototype/static/assets/) | Ilustrasi SVG, simbol antarmuka, dan favicon |
| [prototype/server.py](prototype/server.py) | Penyajian aplikasi dan mode server tanpa model |
| [prototype/start.ps1](prototype/start.ps1) | Peluncur aplikasi dengan opsi pratinjau |
| [prototype/tests/ui_mobile.cjs](prototype/tests/ui_mobile.cjs) | Pemeriksaan antarmuka dan alur dengan respons server tiruan |
