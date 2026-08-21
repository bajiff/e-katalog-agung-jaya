# Software Requirements Specification (SRS)
## E-Katalog UMKM Desa Pasiragung

**Versi:** 1.0
**Tanggal:** 18 Agustus 2026
**Disusun oleh:** Mr. Baji
**Status:** Draft
**Dokumen acuan:** PRD-eKatalog-Pasiragung.md v1.0

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan kebutuhan perangkat lunak secara teknis untuk sistem E-Katalog UMKM/BUMDes Desa Pasiragung, sebagai turunan dari PRD yang telah disepakati. SRS ini menjadi acuan pengembangan (arsitektur, struktur data, API, dan validasi).

### 1.2 Ruang Lingkup Sistem
Sistem terdiri dari dua bagian terpisah:
- **Frontend (FE):** `e-katalog-pasiragung` — ReactJS + axios, deploy di Vercel.
- **Backend (BE):** `api-katalog-pasirasung` — ExpressJS + Prisma ORM + PostgreSQL, deploy di Railway.

### 1.3 Definisi & Singkatan
| Istilah | Keterangan |
|---|---|
| SRS | Software Requirements Specification |
| BE | Backend |
| FE | Frontend |
| ORM | Object Relational Mapping |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| CRUD | Create, Read, Update, Delete |

---

## 2. Arsitektur Sistem

```
[ React FE (Vercel) ]  <--axios/HTTPS-->  [ Express BE (Railway) ]  <--Prisma-->  [ PostgreSQL ]
                                                    |
                                            [ Image storage/WebP ]
```

- Komunikasi FE-BE murni via REST API (JSON), dengan **CORS** di BE yang membatasi origin hanya ke domain FE (Vercel).
- Autentikasi menggunakan **JWT** (disimpan di FE, dikirim di header `Authorization: Bearer <token>`).
- Middleware BE memvalidasi role (`super_admin` / `admin`) sebelum mengizinkan akses ke endpoint tertentu.
- Upload gambar diproses BE (multer → sharp → convert WebP) sebelum disimpan; path/URL disimpan di database.

---

## 3. Struktur Data (Model/ERD Sederhana)

### 3.1 Tabel `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID/int (PK) | Primary key |
| name | String | Nama lengkap |
| email | String (unique) | Untuk login |
| password | String (hashed) | Di-hash dengan bcrypt |
| role | Enum(`super_admin`, `admin`) | Role user |
| status | Enum(`pending`, `approved`, `rejected`) | Status approval, default `pending` saat registrasi |
| registration_token | String (unique, random, panjang) | Token unik per registrasi, dipakai untuk mengakses halaman status pending (`/status/:token`) tanpa membocorkan identitas user lain |
| verification_code_hash | String (nullable) | Hash (bukan plaintext) dari kode verifikasi email yang dikirim setelah super_admin approve |
| verification_code_expires_at | DateTime (nullable) | Waktu kedaluwarsa kode verifikasi (mis. 15 menit setelah dibuat) |
| verification_attempts | Int (default 0) | Jumlah percobaan input kode, untuk rate limiting/lockout |
| created_at | DateTime | |
| updated_at | DateTime | |

### 3.2 Tabel `categories`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID/int (PK) | Primary key |
| name | String (unique) | Nama kategori (mis. Makanan, Minuman) |
| created_at | DateTime | |
| updated_at | DateTime | |

### 3.3 Tabel `products`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID/int (PK) | Primary key |
| name | String | Nama produk (wajib) |
| image_url | String | Path/URL gambar (WebP) (wajib) |
| stock_status | Enum(`tersedia`, `belum_tersedia`) | Status stok (wajib) |
| category_id | FK → categories.id | Relasi ke kategori (wajib) |
| whatsapp_number | String | Nomor WhatsApp, format tervalidasi (wajib) |
| description | Text | Deskripsi singkat produk (wajib) |
| owner_name | String | Nama pemilik usaha (mis. "Ibu Harni") (wajib) |
| production_system | Enum(`pre_order`, `ready_stock`) atau String | Sistem produksi (mis. "Pre-order (Dibuat berdasarkan pesanan)") (wajib) |
| net_weight | String/Numeric + unit | Berat bersih/netto (mis. "200 gram") (wajib) |
| price | Decimal/Numeric | Harga produk (mis. Rp 15.000) (wajib) |
| flavor_variants | JSON/Text (mis. array of `{name, description}`) | Varian rasa, tiap varian punya nama + deskripsi singkat (mis. Original, Manis) (wajib) |
| composition | Text | Komposisi/bahan produk (mis. "Beras ketan, gula putih, ...") (wajib) |
| nib_number | String (nullable) | Nomor Induk Berusaha, opsional, tervalidasi maksimal 13 digit angka |
| halal_certificate_number | String (nullable) | Nomor Sertifikat Halal, opsional, format 2 huruf (kode negara, mis. "ID") + 15 digit angka = total 17 karakter |
| created_by | FK → users.id | Admin/super_admin yang membuat (untuk audit, bukan pembatas akses — lihat FR-8a) |
| created_at | DateTime | |
| updated_at | DateTime | |

### 3.4 Relasi
- `categories` 1 — N `products`
- `users` 1 — N `products` (kolom `created_by`, hanya untuk jejak/audit, bukan kepemilikan eksklusif — sesuai shared pool model)

---

## 4. Kebutuhan Fungsional Detail & Spesifikasi API

### 4.1 Modul Autentikasi & Registrasi

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/auth/register` | POST | Publik | Registrasi akun baru, otomatis `role: admin`, `status: pending`. Sistem membuat `registration_token` unik dan mengembalikannya ke FE untuk redirect ke halaman status (`/status/:registration_token`) |
| `/api/auth/status/:token` | GET | Publik (terikat token) | Mengambil status akun (`pending`/`approved`/`rejected`) berdasarkan `registration_token` — tidak membocorkan data user lain |
| `/api/auth/status/:token/verify` | POST | Publik (terikat token) | Submit kode verifikasi email. Divalidasi terhadap `verification_code_hash`, `verification_code_expires_at`, dan `verification_attempts` (rate limited, mis. maks 5x percobaan lalu terkunci/butuh kirim ulang) |
| `/api/auth/login` | POST | Publik | Login dengan email + password, mengembalikan JWT hanya jika `status: approved` (atau `super_admin`). Login tetap wajib walau kode verifikasi sudah benar — tidak ada auto-login dari endpoint verifikasi |
| `/api/auth/me` | GET | Authenticated | Mengambil data & status akun sendiri |

**Validasi registrasi:**
- Email wajib unik & format valid.
- Password minimal 8 karakter (disarankan kombinasi huruf & angka).
- Jika `status` masih `pending`/`rejected` saat login, sistem menolak akses dashboard dan menampilkan status akun (FR-6a).

**Alur verifikasi email setelah approve (detail):**
1. Super_admin klik approve → BE generate kode verifikasi acak (mis. 8 digit atau token alfanumerik), simpan **hash**-nya (bukan plaintext) beserta `verification_code_expires_at` (mis. +15 menit), kirim kode asli via email ke user.
2. User membuka kembali halaman `/status/:registration_token` (halaman ini sudah dibuka sejak awal registrasi, sehingga sudah terikat ke akunnya sendiri, bukan form publik terbuka).
3. User submit kode → BE bandingkan hash kode input vs `verification_code_hash` menggunakan constant-time comparison, cek belum expired, cek `verification_attempts` belum melebihi batas.
4. Jika valid → `status: approved`, kode & token verifikasi di-invalidate (dihapus/null-kan) agar tidak bisa dipakai ulang (single-use).
5. Jika tidak valid → `verification_attempts` bertambah; setelah melebihi batas, endpoint mengunci sementara (mis. 15-30 menit) atau mewajibkan kirim ulang kode oleh super_admin/user.
6. User tetap harus login manual (email + password) setelah status `approved` — endpoint verifikasi **tidak** langsung memberi JWT/session.

### 4.2 Modul Manajemen Admin (khusus Super Admin)

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/admin/requests` | GET | super_admin | Daftar user dengan `status: pending` |
| `/api/admin/requests/:id/approve` | PATCH | super_admin | Ubah status user menjadi `approved`-in-progress: generate & kirim kode verifikasi email (lihat alur di 4.1); status final `approved` baru berlaku setelah user memverifikasi kode |
| `/api/admin/requests/:id/reject` | PATCH | super_admin | Ubah status user menjadi `rejected` |
| `/api/admin/users` | GET | super_admin | Daftar seluruh admin |
| `/api/admin/users/:id` | DELETE | super_admin | Nonaktifkan/hapus akun admin |

### 4.3 Modul Kategori

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/categories` | GET | Publik | List kategori (dipakai FE publik untuk filter, dan FE admin untuk dropdown) |
| `/api/categories` | POST | admin, super_admin | Tambah kategori baru |
| `/api/categories/:id` | PUT | admin, super_admin | Ubah nama kategori |
| `/api/categories/:id` | DELETE | admin, super_admin | Hapus kategori (ditolak jika masih dipakai produk, kembalikan error 409) |

### 4.4 Modul Produk

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/products` | GET | Publik | List produk, mendukung query filter `?category=` `&stock_status=` |
| `/api/products/:id` | GET | Publik | Detail satu produk |
| `/api/products` | POST | admin, super_admin | Tambah produk (multipart/form-data untuk upload gambar) |
| `/api/products/:id` | PUT | admin, super_admin | Ubah produk |
| `/api/products/:id` | DELETE | admin, super_admin | Hapus produk |

**Validasi produk:**
- `name`, `category_id`, `whatsapp_number`, `description`, `owner_name`, `production_system`, `net_weight`, `price`, `flavor_variants` (minimal 1 varian), `composition` wajib diisi.
- `whatsapp_number` divalidasi format (mis. regex angka, boleh diawali `+62` atau `08`).
- `image`: wajib saat create; tipe file dibatasi (jpg/jpeg/png), ukuran maksimum (mis. 5MB) sebelum dikompres; dikonversi ke WebP oleh BE.
- `stock_status` hanya menerima `tersedia` / `belum_tersedia`.
- `price` harus angka positif.
- `nib_number` **opsional**; jika diisi, divalidasi harus numerik dan maksimal 13 digit.
- `halal_certificate_number` **opsional**; jika diisi, divalidasi format 2 huruf kode negara + 15 digit angka (total 17 karakter, mis. `ID123456789012345`).

### 4.5 Modul Katalog Publik (FE)
- Halaman List Produk: menampilkan grid produk, filter kategori & status stok, search by nama (opsional/enhancement).
- Halaman Detail Produk: menampilkan seluruh informasi + tombol "Hubungi via WhatsApp" yang mengarah ke `https://wa.me/<nomor>?text=<pesan default>`.

---

## 5. Kebutuhan Non-Fungsional (Detail Teknis)

| Kategori | Spesifikasi |
|---|---|
| Keamanan | Password di-hash (bcrypt), JWT dengan masa berlaku (expiry) wajar (mis. 1-7 hari), middleware RBAC di setiap endpoint admin |
| CORS | BE mengizinkan origin sesuai domain FE Vercel (dan localhost saat development) |
| Performa | Gambar dikompres ke WebP, ukuran maksimum ditentukan (mis. lebar 800px) |
| Skalabilitas | Struktur database dinormalisasi (kategori terpisah dari produk) agar mudah dikembangkan |
| Error Handling | Response API konsisten (status code + pesan error terstruktur JSON) |
| Environment Config | Kredensial (DB URL, JWT secret) disimpan di `.env`, tidak di-commit ke repo |

### 5.1 Pertimbangan Keamanan — Alur Verifikasi Email Admin

Alur approval admin melibatkan pengiriman kode via email, sehingga rawan disalahgunakan jika tidak dimitigasi. Ketentuan berikut **wajib** diterapkan:

| Risiko | Mitigasi |
|---|---|
| Halaman status pending bisa diakses/ditebak untuk akun lain | Halaman terikat `registration_token` unik & panjang (bukan form email+kode terbuka) |
| Kode ditebak (brute force) | Kode acak cukup panjang (mis. 6-8 karakter alfanumerik) + batasi jumlah percobaan (`verification_attempts`) + lockout sementara setelah gagal berkali-kali |
| Kode tidak kedaluwarsa | `verification_code_expires_at` wajib diisi (mis. 15 menit) dan dicek di setiap verifikasi |
| Kode bocor dari database | Simpan **hash** kode (mis. bcrypt/sha256), bukan plaintext |
| Timing attack saat membandingkan kode | Gunakan constant-time comparison (bukan `===` biasa) |
| Kode dipakai ulang (replay) | Kode di-invalidate (null-kan) setelah berhasil dipakai sekali (single-use) |
| Auto-login hanya bermodal kode | Verifikasi kode **tidak** menghasilkan JWT; user tetap wajib login manual dengan password setelahnya |
| Spam registrasi/percobaan kode | Rate limiting di endpoint `register`, `login`, dan `status/:token/verify` (mis. via `express-rate-limit`) |
| Kode terekspos di log/response API | Jangan pernah log kode asli di server; response API tidak boleh mengembalikan kode asli di body manapun |

---

## 6. Batasan Implementasi
- FE dan BE adalah repo terpisah (`e-katalog-pasiragung` dan `api-katalog-pasirasung`), sehingga deployment dan versi dikelola independen.
- Autentikasi menggunakan JWT (stateless), bukan session-based, karena FE-BE terpisah domain.
- Notifikasi email (FR-6b) bersifat opsional dan dapat ditambahkan belakangan tanpa mengubah struktur data inti.

---

## 7. Lampiran — Ringkasan Endpoint

```
Auth:
  POST   /api/auth/register
  GET    /api/auth/status/:token
  POST   /api/auth/status/:token/verify
  POST   /api/auth/login
  GET    /api/auth/me

Admin Management (super_admin only):
  GET    /api/admin/requests
  PATCH  /api/admin/requests/:id/approve
  PATCH  /api/admin/requests/:id/reject
  GET    /api/admin/users
  DELETE /api/admin/users/:id

Categories:
  GET    /api/categories
  POST   /api/categories
  PUT    /api/categories/:id
  DELETE /api/categories/:id

Products:
  GET    /api/products
  GET    /api/products/:id
  POST   /api/products
  PUT    /api/products/:id
  DELETE /api/products/:id
```

---

*Setelah SRS ini disepakati, dokumen selanjutnya adalah SDLC yang akan menjabarkan tahapan pengerjaan project dari perencanaan hingga handover.*

---

## 8. Panduan Desain — Palet Warna

| Peran | Kode Warna |
|---|---|
| Primary | `#4CAF50` |
| Background | `#E8F5E9` |
| Gradient | Perpaduan antara Primary (`#4CAF50`) dan Warna Hijau (`#A2AD59`) |
| Text | `#424242` |
| Hijau (aksen) | `#A2AD59` |

> Catatan: nilai/arah gradient (linear/radial, derajat) belum ditentukan — perlu dikonfirmasi saat implementasi UI di FE.

---

## 9. Standar Arsitektur Kode (Wajib Diikuti Saat Implementasi)

Prinsip berikut wajib diterapkan di kedua repo (`e-katalog-pasiragung` dan `api-katalog-pasirasung`) selama development, sebagai standar kualitas kode:

### 9.1 Barrel File
- Setiap folder modul (mis. `modules/product`, `modules/category`, `modules/auth` di BE; `components/ui`, `components/product` di FE) menyediakan satu `index.js`/`index.ts` yang me-re-export isi folder tersebut.
- Import dari modul lain dilakukan melalui barrel file (`import { productController } from '@/modules/product'`), bukan langsung ke file internal (`.../product.controller.js`), agar struktur internal modul bisa berubah tanpa merusak import di tempat lain.

### 9.2 KISS (Keep It Simple, Stupid)
- Hindari abstraksi berlapis untuk logic yang sebenarnya sederhana (CRUD Produk & Kategori) — satu fungsi jelas per aksi (`createProduct`, `updateProduct`) lebih diutamakan daripada generic factory yang rumit.
- Gunakan library validasi yang sudah teruji (mis. `zod`/`express-validator`) daripada membangun validator custom sendiri.
- Struktur folder dan penamaan file konsisten dan mudah ditelusuri, tanpa over-engineering.

### 9.3 DRY (Don't Repeat Yourself)
- Karena modul **Produk** dan **Kategori** memiliki pola CRUD yang mirip, BE menyediakan **generic CRUD service/repository** (berbasis Prisma) yang dipakai ulang oleh kedua modul, dengan skema validasi berbeda per modul.
- Middleware RBAC (pengecekan role `admin`/`super_admin`) dan middleware autentikasi JWT dibuat satu kali sebagai reusable middleware, dipakai di seluruh route yang membutuhkan — bukan duplikasi logic per route.
- Di FE, logic fetch/loading/error state yang berulang (list produk, list kategori) diekstrak ke custom hook reusable (mis. `useCrud` atau `useFetch`), bukan ditulis ulang di tiap halaman.