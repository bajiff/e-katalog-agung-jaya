# Product Requirements Document (PRD)

## E-Katalog UMKM Desa Pasiragung

**Versi:** 1.0
**Tanggal:** 18 Agustus 2026
**Disusun oleh:** Mr. Baji
**Status:** Draft
**Dokumen acuan:** -

---

## 1. Latar Belakang

Desa Pasiragung memiliki produk-produk BUMDes yang belum memiliki media digital untuk dipromosikan secara luas. Selama ini informasi produk hanya tersebar dari mulut ke mulut atau media sosial pribadi, sehingga jangkauan pasar terbatas. Dibutuhkan sebuah website katalog produk yang dapat dikelola secara mandiri oleh pihak desa, dengan sistem admin yang jelas agar pengelolaan data produk tetap terkontrol dan aman.

Project ini juga merupakan Project Based Learning (PjBL) untuk program kerja individu KKM sekaligus sebagai bahan portofolio.

## 2. Tujuan Produk

1. Menyediakan katalog produk BUMDes Desa Pasiragung yang dapat diakses publik secara online.
2. Memungkinkan pengelolaan produk (tambah/ubah/hapus/lihat) oleh admin yang telah tervalidasi.
3. Menjaga kontrol akses melalui mekanisme approval admin oleh super_admin, agar tidak sembarang orang bisa mengelola data produk.
4. Memberikan kemudahan bagi calon pembeli untuk menghubungi penjual/desa langsung via WhatsApp.
5. Menjadi aset digital yang diserahterimakan (handover) kepada perangkat desa setelah selesai.

## 3. Target Pengguna

|Peran|Deskripsi|
|---|---|
|**Pengunjung (Publik)**|Masyarakat umum yang mengakses katalog untuk melihat produk BUMDes, tanpa perlu login.|
|**Admin**|Pengguna yang telah mendaftar dan disetujui oleh super_admin, dapat mengelola (CRUD) data produk.|
|**Super Admin**|Pengelola tertinggi sistem (mis. perangkat desa/pengelola BUMDes), dapat mengelola semua data termasuk memvalidasi/menolak pengajuan admin baru dan mengelola akun admin.|

## 4. Ruang Lingkup (Scope)

### 4.1 Termasuk dalam scope (In-Scope)

- Halaman katalog publik (list & detail produk) tanpa login.
- Sistem registrasi akun untuk calon admin.
- Sistem approval/validasi admin oleh super_admin.
- CRUD produk oleh admin yang sudah disetujui.
- Manajemen akun admin oleh super_admin (approve, reject, nonaktifkan).
- Autentikasi & otorisasi berbasis role (super_admin, admin).

### 4.2 Tidak termasuk dalam scope (Out of Scope) — untuk versi awal

- Transaksi jual-beli online (pembayaran, checkout, keranjang).
- Multi-toko/multi-UMKM dengan pemilik produk berbeda-beda (produk seluruhnya milik BUMDes desa).
- Sistem ulasan/rating produk oleh pengunjung.
- Aplikasi mobile native.

> Catatan: fitur di luar scope ini dapat menjadi bahan pengembangan lanjutan (fase 2), tapi tidak dikerjakan pada versi awal.

## 5. Alur Pengguna (User Flow) — Ringkasan

**Alur Publik:** Pengunjung membuka website → melihat daftar produk → filter/cari berdasarkan kategori atau status stok → melihat detail produk → klik tombol WhatsApp untuk menghubungi.

**Alur Registrasi Admin:** Calon admin membuka halaman registrasi → mengisi data diri → submit → status akun "pending" → super_admin meninjau pengajuan di dashboard → super_admin approve/reject → jika approve, akun berubah menjadi admin aktif dan dapat login → jika reject, akun tidak dapat mengakses dashboard admin (dengan/atau tanpa notifikasi alasan).

**Alur Super Admin:** Login → dashboard → melihat daftar pengajuan admin baru → approve/reject → mengelola seluruh data produk & admin tanpa batasan.

**Alur Admin (setelah disetujui):** Login → dashboard admin → tambah produk baru / lihat daftar produk miliknya (atau semua, tergantung kebijakan) / edit produk / hapus produk.

## 6. Kebutuhan Fungsional (Functional Requirements)

### 6.1 Manajemen Akun & Otorisasi

- FR-1: Sistem harus menyediakan halaman registrasi untuk calon admin.
- FR-2: Akun yang baru registrasi berstatus `pending` dan belum dapat mengakses fitur CRUD produk.
- FR-3: Super_admin dapat melihat daftar pengajuan admin dengan status `pending`.
- FR-4: Super_admin dapat menyetujui (approve) atau menolak (reject) pengajuan admin.
- FR-5: Akun dengan status `approved` dapat login dan mengakses dashboard admin.
- FR-6: Super_admin dapat menonaktifkan/menghapus akun admin kapan saja.
- FR-6a: Status pengajuan admin (`pending`/`approved`/`rejected`) ditampilkan di dashboard akun yang bersangkutan sebagai bentuk notifikasi minimal (tanpa email).
- FR-6b (opsional/nice-to-have): Notifikasi email ke calon admin saat status disetujui/ditolak, jika waktu pengerjaan memungkinkan.
- FR-7: Sistem membedakan hak akses antara super_admin dan admin (role-based access control).

### 6.2 Manajemen Produk (CRUD)

- FR-8: Admin (dan super_admin) dapat menambahkan produk baru dengan field:
    - Nama Produk (teks, wajib)
    - Foto Produk (upload gambar, wajib, dikompres & dikonversi ke format WebP otomatis di sisi server sebelum disimpan)
    - Stok — Tersedia / Belum Tersedia (pilihan, wajib)
    - Kategori — dipilih dari daftar kategori yang dikelola tersendiri, mis. Makanan, Minuman, dll (dropdown, wajib)
    - Nomor WhatsApp (teks/angka, wajib, tervalidasi format nomor)
    - Deskripsi (teks panjang, wajib)
- FR-8a: Semua admin dan super_admin dapat mengelola (lihat/ubah/hapus) seluruh produk yang ada (shared pool BUMDes) — produk tidak terikat kepemilikan admin tertentu, karena seluruh produk adalah milik BUMDes desa.
- FR-8b: Gambar produk yang diunggah harus dikompres/resize otomatis di sisi server dan dikonversi ke format **WebP** (mis. menggunakan library seperti `sharp`) sebelum disimpan, untuk menjaga performa loading halaman katalog.
- FR-9: Admin dapat mengubah (update) data produk yang sudah ada.
- FR-10: Admin dapat menghapus produk.
- FR-11: Admin dapat melihat daftar seluruh produk dalam bentuk tabel/list di dashboard.
- FR-12: Sistem harus melakukan validasi input pada setiap form (field wajib, format nomor WhatsApp, dsb).

### 6.2.1 Manajemen Kategori

- FR-12a: Sistem menyediakan menu/navigasi tersendiri (sidebar) khusus untuk pengelolaan kategori, terpisah dari menu produk.
- FR-12b: Admin/super_admin dapat menambahkan kategori baru.
- FR-12c: Admin/super_admin dapat mengubah nama kategori yang sudah ada.
- FR-12d: Admin/super_admin dapat menghapus kategori (dengan validasi agar tidak menghapus kategori yang masih dipakai produk, atau menampilkan peringatan).
- FR-12e: Kategori yang tersedia di sistem akan muncul sebagai pilihan (dropdown) saat menambah/mengubah produk pada form Kategori.

### 6.3 Katalog Publik

- FR-13: Pengunjung dapat melihat daftar produk tanpa perlu login.
- FR-14: Pengunjung dapat melihat detail satu produk.
- FR-15: Pengunjung dapat memfilter produk berdasarkan kategori dan/atau status stok.
- FR-16: Pengunjung dapat mengklik tombol/link yang mengarah ke WhatsApp (wa.me) dengan nomor sesuai produk.

## 7. Kebutuhan Non-Fungsional (Non-Functional Requirements)

- NFR-1 (Usability): Antarmuka mudah digunakan oleh perangkat desa yang awam teknologi (bahasa Indonesia, UI sederhana).
- NFR-2 (Responsiveness): Tampilan responsif di desktop dan mobile.
- NFR-3 (Security): Password disimpan ter-hash; endpoint admin dilindungi middleware otorisasi berbasis role.
- NFR-4 (Performance): Halaman katalog publik dapat dimuat dengan cepat meski koneksi internet desa terbatas.
- NFR-5 (Maintainability): Kode terstruktur rapi agar mudah diserahterimakan (handover) dan dipelihara oleh pihak desa/developer lain di kemudian hari.
- NFR-6 (Portability): Dapat di-deploy dengan mudah (mis. Vercel) dan didokumentasikan agar bisa dijalankan ulang oleh pihak lain.

## 8. Batasan (Constraints)

- Dikerjakan oleh satu individu (self-directed) sebagai bagian dari PjBL KKM, sehingga fitur harus realistis dengan waktu dan kapasitas pengerjaan.
- Backend/skema role (super_admin & admin) sudah dibuat sebelumnya — PRD ini menyesuaikan dengan struktur yang sudah ada, bukan merancang dari nol.
- Tech stack:
    - **Frontend:** ReactJS + axios (repo: `e-katalog-pasiragung`), deploy ke **Vercel**.
    - **Backend:** ExpressJS (repo: `api-katalog-pasirasung`), deploy ke **Railway**.
    - **Database:** PostgreSQL, dengan **Prisma** sebagai ORM.
    - **CORS:** dikonfigurasi di Express agar hanya mengizinkan origin dari domain frontend (Vercel), karena FE dan BE di-deploy terpisah.
    - Gambar produk dikompres & dikonversi ke format **WebP** di server (mis. via `sharp`) sebelum disimpan.

## 9. Metrik Keberhasilan (Success Metrics)

- Website berhasil di-deploy dan dapat diakses publik.
- Super_admin dapat memvalidasi minimal satu akun admin baru dengan sukses.
- Admin dapat melakukan CRUD produk penuh tanpa error.
- Website berhasil diserahterimakan (handover) ke perangkat desa dengan dokumentasi penggunaan.

## 10. Asumsi Terbuka (Open Questions) — perlu diklarifikasi sebelum ke SRS

Semua pertanyaan berikut sudah terjawab dan dituangkan ke dalam requirement di atas:

1. ~~Admin kelola produk sendiri atau semua produk?~~ — **Dijawab:** shared pool BUMDes, semua admin/super_admin bisa kelola semua produk (FR-8a).
2. ~~Notifikasi approve/reject?~~ — **Dijawab:** status ditampilkan di dashboard (wajib, FR-6a); email bersifat opsional/nice-to-have (FR-6b).
3. ~~Produk perlu foto/gambar?~~ — **Dijawab:** ya, wajib, dikompres otomatis di server (FR-8, FR-8b).
4. ~~Kategori hardcoded atau dikelola?~~ — **Dijawab:** dikelola tersendiri melalui menu/sidebar CRUD kategori (FR-12a–FR-12e).

---

_Setelah PRD ini disepakati/direvisi, dokumen selanjutnya adalah SRS (Software Requirements Specification) yang akan menjabarkan kebutuhan ini secara lebih teknis dan detail._