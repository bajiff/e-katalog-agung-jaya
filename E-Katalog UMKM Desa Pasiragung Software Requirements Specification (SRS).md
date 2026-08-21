# Software Requirements Specification (SRS)
## E-Katalog UMKM Desa Pasiragung

**Versi:** 2.0
**Tanggal:** 21 Agustus 2026
**Disusun oleh:** Mr. Baji
**Status:** Draft (Revisi dari v1.0)
**Dokumen acuan:** PRD-eKatalog-Pasiragung.md v1.0

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan kebutuhan perangkat lunak secara teknis untuk sistem E-Katalog UMKM/BUMDes Desa Pasiragung, sebagai turunan dari PRD yang telah disepakati. SRS ini menjadi acuan pengembangan (arsitektur, struktur data, API, dan validasi).

### 1.2 Ruang Lingkup Sistem
Sistem terdiri dari dua bagian terpisah:
- **Frontend (FE):** `e-katalog-pasiragung` — ReactJS + axios, deploy di Vercel.
- **Backend (BE):** `api-katalog-pasiragung` — ExpressJS + Prisma ORM v7 + PostgreSQL, ditulis dalam **TypeScript** (ESM), deploy di Railway.

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
| ESM | ECMAScript Modules |

---

## 2. Arsitektur Sistem

```
[ React FE (Vercel) ]  <--axios/HTTPS-->  [ Express BE (Railway) ]  <--Prisma v7 + adapter-pg-->  [ PostgreSQL ]
                                                    |                        |
                                             [ Cloudinary ]          [ Nodemailer/SMTP ]
                                          (Image WebP storage)    (Email kode verifikasi)
```

- Komunikasi FE-BE murni via REST API (JSON), dengan **CORS** di BE yang membatasi origin hanya ke domain FE (Vercel).
- Autentikasi menggunakan **JWT** (disimpan di FE, dikirim di header `Authorization: Bearer <token>`).
- Middleware BE memvalidasi role (`super_admin` / `admin`) sebelum mengizinkan akses ke endpoint tertentu.
- Upload gambar diproses BE (multer memory storage → sharp → convert WebP) lalu diunggah ke **Cloudinary**; URL Cloudinary dan `public_id` disimpan di database.
- Email kode verifikasi dikirim menggunakan **Nodemailer** via SMTP (Mailtrap untuk development, Brevo/Resend untuk production).
- BE menggunakan **Prisma ORM v7** dengan **driver adapter** (`@prisma/adapter-pg`) — Prisma Client tidak lagi menggunakan Rust query engine, melainkan TypeScript/WASM-based Query Compiler.
- Konfigurasi database dipindah dari `schema.prisma` ke **`prisma.config.ts`** (file baru di root project).
- Project menggunakan **TypeScript** dengan **ESM** (`"type": "module"` di `package.json`).

### 2.1 Tech Stack Detail

| Komponen | Stack | Versi |
|---|---|---|
| Language | TypeScript | ≥ 5.4.0 |
| Runtime | Node.js + ExpressJS | — |
| ORM | Prisma | v7.x |
| DB Adapter | `@prisma/adapter-pg` + `pg` | v7.x / v8.x |
| Database | PostgreSQL | — |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) | — |
| Upload | multer → sharp → **Cloudinary** | — |
| Validasi | zod | v3.x |
| Rate Limiting | express-rate-limit | v7.x |
| Email | Nodemailer | v6.x |
| Deploy | Railway (BE), Vercel (FE) | — |

---

## 3. Struktur Data (Model/ERD Sederhana)

### 3.1 Tabel `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | Primary key |
| name | String | Nama lengkap |
| email | String (unique) | Untuk login |
| password | String (hashed) | Di-hash dengan bcrypt |
| role | Enum(`super_admin`, `admin`) | Role user, default `admin` saat registrasi |
| status | Enum(`pending`, `awaiting_verification`, `approved`, `rejected`) | Status approval. Default `pending` saat registrasi. Berubah ke `awaiting_verification` saat super_admin approve (kode verifikasi dikirim). Berubah ke `approved` setelah user berhasil verifikasi kode |
| registration_token | String (unique, random, panjang) | Token unik per registrasi, dipakai untuk mengakses halaman status pending (`/status/:token`) tanpa membocorkan identitas user lain |
| verification_code_hash | String (nullable) | Hash (bukan plaintext) dari kode verifikasi email yang dikirim setelah super_admin approve |
| verification_code_expires_at | DateTime (nullable) | Waktu kedaluwarsa kode verifikasi (mis. 15 menit setelah dibuat) |
| verification_attempts | Int (default 0) | Jumlah percobaan input kode, untuk rate limiting/lockout |
| created_at | DateTime | |
| updated_at | DateTime | |

### 3.2 Tabel `categories`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | Primary key |
| name | String (unique) | Nama kategori (mis. Makanan, Minuman) |
| created_at | DateTime | |
| updated_at | DateTime | |

### 3.3 Tabel `products`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | Primary key |
| name | String | Nama produk (wajib) |
| image_url | String | URL gambar di Cloudinary (format WebP) (wajib) |
| image_public_id | String (nullable) | `public_id` Cloudinary, digunakan untuk menghapus gambar saat produk dihapus atau gambar diperbarui |
| stock_status | Enum(`tersedia`, `belum_tersedia`) | Status stok (wajib) |
| category_id | FK → categories.id | Relasi ke kategori (wajib) |
| whatsapp_number | String | Nomor WhatsApp, format tervalidasi (wajib) |
| description | Text | Deskripsi singkat produk (wajib) |
| owner_name | String | Nama pemilik usaha (mis. "Ibu Harni") (wajib) |
| production_system | Enum(`pre_order`, `ready_stock`) | Sistem produksi (wajib) |
| net_weight | String | Berat bersih/netto (mis. "200 gram") (wajib) |
| price | Decimal(12,2) | Harga produk (mis. Rp 15.000) (wajib) |
| flavor_variants | JSON (array of `{name, description}`) | Varian rasa, tiap varian punya nama + deskripsi singkat (mis. Original, Manis) (wajib, minimal 1 varian) |
| composition | Text | Komposisi/bahan produk (mis. "Beras ketan, gula putih, ...") (wajib) |
| nib_number | String (nullable) | Nomor Induk Berusaha, opsional, tervalidasi maksimal 13 digit angka |
| halal_certificate_number | String (nullable) | Nomor Sertifikat Halal, opsional, format 2 huruf (kode negara, mis. "ID") + 15 digit angka = total 17 karakter |
| created_by | FK → users.id | Admin/super_admin yang membuat (untuk audit, bukan pembatas akses — lihat FR-8a) |
| created_at | DateTime | |
| updated_at | DateTime | |

### 3.4 Relasi
- `categories` 1 — N `products`
- `users` 1 — N `products` (kolom `created_by`, hanya untuk jejak/audit, bukan kepemilikan eksklusif — sesuai shared pool model)

### 3.5 Aturan Transisi Status User

Transisi status berikut **wajib ditaati** di backend. Transisi di luar daftar ini tidak diizinkan.

| Dari | Ke | Trigger | Catatan |
|---|---|---|---|
| `pending` | `awaiting_verification` | Super admin approve | Generate kode verifikasi → kirim email |
| `pending` | `rejected` | Super admin reject | — |
| `awaiting_verification` | `approved` | User submit kode verifikasi benar | Kode, hash, expiry, dan token verifikasi di-invalidate (null-kan) |
| `awaiting_verification` | `awaiting_verification` | User/sistem resend kode | Kode lama di-invalidate, kode baru di-generate |
| `awaiting_verification` | `rejected` | Super admin reject | Misalnya jika super_admin berubah pikiran sebelum user verifikasi |

**Transisi yang TIDAK BOLEH terjadi:**
- `approved` → `pending` (tidak bisa kembali ke pending)
- `rejected` → `approved` (harus register ulang)
- `pending` → `approved` (harus lewat `awaiting_verification` terlebih dahulu, untuk memastikan email terverifikasi)
- `awaiting_verification` → `pending` (sudah di-approve, tidak bisa di-un-approve)

**Edge case:**
- Jika super admin approve tetapi email gagal terkirim: **rollback status ke `pending`**, kembalikan error ke super admin. Status `awaiting_verification` hanya boleh di-set jika email berhasil terkirim.

---

## 4. Kebutuhan Fungsional Detail & Spesifikasi API

Total endpoint: **20 endpoint** (6 auth + 5 admin + 4 kategori + 5 produk).

### 4.1 Modul Autentikasi & Registrasi

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/auth/register` | POST | Publik | Registrasi akun baru, otomatis `role: admin`, `status: pending`. Sistem membuat `registration_token` unik dan mengembalikannya ke FE untuk redirect ke halaman status (`/status/:registration_token`) |
| `/api/auth/status/:token` | GET | Publik (terikat token) | Mengambil status akun (`pending`/`awaiting_verification`/`approved`/`rejected`) berdasarkan `registration_token` — tidak membocorkan data user lain |
| `/api/auth/status/:token/verify` | POST | Publik (terikat token) | Submit kode verifikasi email. Hanya berlaku jika `status: awaiting_verification`. Divalidasi terhadap `verification_code_hash`, `verification_code_expires_at`, dan `verification_attempts` (rate limited, mis. maks 5x percobaan lalu terkunci/butuh kirim ulang). **Tidak menghasilkan JWT** |
| `/api/auth/status/:token/resend` | POST | Publik (terikat token) | Kirim ulang kode verifikasi. Hanya berlaku jika `status: awaiting_verification`. Rate limited (maks 3 resend per jam per token). Cooldown: tidak bisa resend jika kode terakhir masih berlaku (belum expired) kecuali `verification_attempts` sudah mencapai batas maksimum. Kode lama di-invalidate sebelum kode baru di-generate |
| `/api/auth/login` | POST | Publik | Login dengan email + password, mengembalikan JWT hanya jika `status: approved`. Login tetap wajib walau kode verifikasi sudah benar — tidak ada auto-login dari endpoint verifikasi |
| `/api/auth/me` | GET | Authenticated | Mengambil data & status akun sendiri |

**Validasi registrasi:**
- Email wajib unik & format valid.
- Password minimal 8 karakter (disarankan kombinasi huruf & angka).
- Jika `status` masih `pending`/`awaiting_verification`/`rejected` saat login, sistem menolak akses dashboard dan menampilkan status akun (FR-6a).

**Alur verifikasi email setelah approve (detail):**
1. Super_admin klik approve → BE mengubah status ke `awaiting_verification`, generate kode verifikasi acak (mis. 8 digit alfanumerik), simpan **hash**-nya (bukan plaintext) beserta `verification_code_expires_at` (mis. +15 menit), kirim kode asli via email ke user menggunakan **Nodemailer**. Jika email gagal terkirim → rollback status ke `pending`.
2. User membuka kembali halaman `/status/:registration_token` (halaman ini sudah dibuka sejak awal registrasi, sehingga sudah terikat ke akunnya sendiri, bukan form publik terbuka). FE menampilkan form input kode verifikasi karena status sekarang `awaiting_verification`.
3. User submit kode → BE bandingkan hash kode input vs `verification_code_hash` menggunakan constant-time comparison, cek belum expired, cek `verification_attempts` belum melebihi batas.
4. Jika valid → `status: approved`, kode & token verifikasi di-invalidate (dihapus/null-kan) agar tidak bisa dipakai ulang (single-use).
5. Jika tidak valid → `verification_attempts` bertambah; setelah melebihi batas, endpoint mengunci sementara dan mewajibkan kirim ulang kode melalui endpoint `/api/auth/status/:token/resend`.
6. User tetap harus login manual (email + password) setelah status `approved` — endpoint verifikasi **tidak** langsung memberi JWT/session.

**Validasi resend kode verifikasi:**
- Resend hanya berlaku jika `status: awaiting_verification`.
- Cooldown: tidak boleh resend jika kode terakhir belum expired **dan** `verification_attempts` belum melebihi batas — kecuali keduanya terpenuhi.
- Rate limit: maks 3 resend per jam per token.
- Kode lama di-invalidate (null-kan hash) sebelum generate kode baru.
- Email dikirim terlebih dahulu; hash baru **hanya disimpan ke DB jika email berhasil terkirim** (transactional).
- `verification_attempts` di-reset ke 0 setelah resend berhasil.

### 4.2 Modul Manajemen Admin (khusus Super Admin)

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/admin/requests` | GET | super_admin | Daftar user dengan `status: pending` |
| `/api/admin/requests/:id/approve` | PATCH | super_admin | Ubah status user ke `awaiting_verification`: generate & kirim kode verifikasi email (lihat alur di §4.1). Status final `approved` baru berlaku setelah user memverifikasi kode. Jika email gagal → rollback ke `pending` |
| `/api/admin/requests/:id/reject` | PATCH | super_admin | Ubah status user menjadi `rejected`. Berlaku untuk user berstatus `pending` maupun `awaiting_verification` |
| `/api/admin/users` | GET | super_admin | Daftar seluruh admin |
| `/api/admin/users/:id` | DELETE | super_admin | **Hard delete** akun admin. Ditolak dengan error **409 Conflict** jika user masih memiliki produk terkait (relasi `created_by`); super_admin harus menghapus/me-reassign produknya terlebih dahulu |

### 4.3 Modul Kategori

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/categories` | GET | Publik | List kategori (dipakai FE publik untuk filter, dan FE admin untuk dropdown). Mendukung pagination opsional via query `?page=&limit=` |
| `/api/categories` | POST | admin, super_admin | Tambah kategori baru |
| `/api/categories/:id` | PUT | admin, super_admin | Ubah nama kategori |
| `/api/categories/:id` | DELETE | admin, super_admin | Hapus kategori (ditolak jika masih dipakai produk, kembalikan error 409) |

### 4.4 Modul Produk

| Endpoint | Method | Akses | Deskripsi |
|---|---|---|---|
| `/api/products` | GET | Publik | List produk, mendukung query filter `?category=&stock_status=`, **search by nama** `&search=` (case-insensitive via ILIKE/Prisma `contains` mode `insensitive`), dan **pagination** `&page=&limit=` |
| `/api/products/:id` | GET | Publik | Detail satu produk |
| `/api/products` | POST | admin, super_admin | Tambah produk (multipart/form-data untuk upload gambar). Gambar diproses (sharp → WebP) lalu diunggah ke **Cloudinary**; URL dan `public_id` disimpan di database |
| `/api/products/:id` | PUT | admin, super_admin | Ubah produk. Jika gambar baru diunggah, gambar lama dihapus dari **Cloudinary** berdasarkan `image_public_id` yang tersimpan |
| `/api/products/:id` | DELETE | admin, super_admin | **Hard delete** produk. Gambar di Cloudinary dihapus berdasarkan `image_public_id` sebelum record dihapus dari database |

**Validasi produk:**
- `name`, `category_id`, `whatsapp_number`, `description`, `owner_name`, `production_system`, `net_weight`, `price`, `flavor_variants` (minimal 1 varian), `composition` wajib diisi.
- `whatsapp_number` divalidasi format (mis. regex angka, boleh diawali `+62` atau `08`).
- `image`: wajib saat create; tipe file dibatasi (jpg/jpeg/png), ukuran maksimum (mis. 5MB) sebelum dikompres; dikonversi ke WebP oleh BE lalu diunggah ke Cloudinary.
- `stock_status` hanya menerima `tersedia` / `belum_tersedia`.
- `price` harus angka positif.
- `nib_number` **opsional**; jika diisi, divalidasi harus numerik dan maksimal 13 digit.
- `halal_certificate_number` **opsional**; jika diisi, divalidasi format 2 huruf kode negara + 15 digit angka (total 17 karakter, mis. `ID123456789012345`).

**Format response pagination (berlaku untuk semua endpoint yang mendukung pagination):**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 47,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

| Query Param | Default | Keterangan |
|---|---|---|
| `page` | `1` | Halaman ke-N |
| `limit` | `10` | Jumlah item per halaman |
| `search` | — | Search by nama produk (case-insensitive) |

### 4.5 Modul Katalog Publik (FE)
- Halaman List Produk: menampilkan grid produk, filter kategori & status stok, **search by nama produk**, dan **pagination**.
- Halaman Detail Produk: menampilkan seluruh informasi + tombol "Hubungi via WhatsApp" yang mengarah ke `https://wa.me/<nomor>?text=<pesan default>`.

---

## 5. Kebutuhan Non-Fungsional (Detail Teknis)

| Kategori | Spesifikasi |
|---|---|
| Keamanan | Password di-hash (bcrypt), JWT dengan masa berlaku (expiry) wajar (mis. 1-7 hari), middleware RBAC di setiap endpoint admin |
| CORS | BE mengizinkan origin sesuai domain FE Vercel (dan localhost saat development) |
| Performa | Gambar dikompres ke WebP (maks lebar 800px), disimpan di **Cloudinary** (bukan filesystem lokal) agar tidak hilang saat redeploy |
| Skalabilitas | Struktur database dinormalisasi (kategori terpisah dari produk) agar mudah dikembangkan |
| Error Handling | Response API konsisten (status code + pesan error terstruktur JSON) |
| Environment Config | Kredensial (DB URL, JWT secret, Cloudinary keys, SMTP credentials) disimpan di `.env`, tidak di-commit ke repo |
| Email | Kode verifikasi dikirim via **Nodemailer** (SMTP). Environment development menggunakan **Mailtrap** (sandbox), production menggunakan **Brevo** (300 email/hari gratis) atau **Resend** (100/hari gratis) |
| Penghapusan Data | Menggunakan **hard delete** (data dihapus permanen). Validasi FK constraint diterapkan sebelum delete (mis. kategori masih dipakai → 409, user masih punya produk → 409) |

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
| Spam registrasi/percobaan kode | Rate limiting di endpoint `register`, `login`, `status/:token/verify`, dan `status/:token/resend` (mis. via `express-rate-limit`) |
| Kode terekspos di log/response API | Jangan pernah log kode asli di server; response API tidak boleh mengembalikan kode asli di body manapun |
| Spam resend membanjiri email user | Rate limit resend: maks 3 per jam per token. Cooldown: tidak bisa resend jika kode masih berlaku (kecuali attempts sudah maks) |
| Kode lama masih valid saat resend | Kode lama di-invalidate (null-kan hash) sebelum generate kode baru — hanya satu kode aktif |
| SMTP down saat resend/approve | Transactional: kirim email dulu → jika berhasil → simpan hash baru ke DB. Jika gagal → rollback status/return error |
| SMTP credentials bocor | `.env` di `.gitignore`. Gunakan environment variables di Railway (production) |
| Gambar orphan di Cloudinary | Saat delete/update produk, selalu hapus gambar lama dari Cloudinary berdasarkan `image_public_id` |

---

## 6. Batasan Implementasi

- FE dan BE adalah repo terpisah (`e-katalog-pasiragung` dan `api-katalog-pasiragung`), sehingga deployment dan versi dikelola independen.
- Autentikasi menggunakan JWT (stateless), bukan session-based, karena FE-BE terpisah domain.
- Notifikasi email verifikasi diimplementasikan menggunakan **Nodemailer** dengan SMTP.
- Gambar produk disimpan di **Cloudinary** (bukan filesystem lokal Railway yang bersifat ephemeral — file hilang saat redeploy).
- BE menggunakan **Prisma ORM v7** yang memiliki beberapa breaking change dibanding v5/v6:
  - **Driver adapter wajib**: Prisma v7 menghapus Rust query engine; koneksi ke PostgreSQL menggunakan `@prisma/adapter-pg` dengan connection pool dari library `pg` (bukan pool built-in Prisma).
  - **`prisma.config.ts`**: Konfigurasi database URL, lokasi schema, dan seed script dipindah dari `schema.prisma` ke file `prisma.config.ts` di root project.
  - **ESM-first**: Prisma v7 hanya mendukung ES modules. `package.json` wajib memiliki `"type": "module"`.
  - **Output eksplisit**: Prisma Client tidak lagi di-generate ke `node_modules`; harus ditentukan output path eksplisit (mis. `../src/generated/prisma`).
  - **Import path berubah**: `import { PrismaClient } from "./generated/prisma/client.js"` (bukan `from "@prisma/client"`).
  - **`prisma generate` manual**: Perintah `migrate dev` dan `db push` tidak lagi otomatis menjalankan `prisma generate`. Developer harus menjalankannya secara manual.
  - **Seed via `tsx`**: Script seed menggunakan `tsx` sebagai runner TypeScript (bukan `ts-node`), dikonfigurasi di `prisma.config.ts`.
  - **Client middleware dihapus**: `prisma.$use(...)` sudah tidak tersedia; gunakan Client Extensions jika dibutuhkan.
- Super admin pertama dibuat melalui **Prisma seed script** (`prisma/seed.ts`) yang dijalankan via `npx prisma db seed`.

---

## 7. Lampiran — Ringkasan Endpoint (20 endpoint)

```
Auth (6 endpoint):
  POST   /api/auth/register
  GET    /api/auth/status/:token
  POST   /api/auth/status/:token/verify
  POST   /api/auth/status/:token/resend
  POST   /api/auth/login
  GET    /api/auth/me

Admin Management — super_admin only (5 endpoint):
  GET    /api/admin/requests
  PATCH  /api/admin/requests/:id/approve
  PATCH  /api/admin/requests/:id/reject
  GET    /api/admin/users
  DELETE /api/admin/users/:id

Categories (4 endpoint):
  GET    /api/categories               ?page=&limit=
  POST   /api/categories
  PUT    /api/categories/:id
  DELETE /api/categories/:id

Products (5 endpoint):
  GET    /api/products                  ?category=&stock_status=&search=&page=&limit=
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

Prinsip berikut wajib diterapkan di kedua repo (`e-katalog-pasiragung` dan `api-katalog-pasiragung`) selama development, sebagai standar kualitas kode:

### 9.1 Barrel File
- Setiap folder modul (mis. `modules/product`, `modules/category`, `modules/auth` di BE; `components/ui`, `components/product` di FE) menyediakan satu `index.ts` yang me-re-export isi folder tersebut.
- Import dari modul lain dilakukan melalui barrel file (`import { productController } from '@/modules/product'`), bukan langsung ke file internal (`.../product.controller.ts`), agar struktur internal modul bisa berubah tanpa merusak import di tempat lain.

### 9.2 KISS (Keep It Simple, Stupid)
- Hindari abstraksi berlapis untuk logic yang sebenarnya sederhana (CRUD Produk & Kategori) — satu fungsi jelas per aksi (`createProduct`, `updateProduct`) lebih diutamakan daripada generic factory yang rumit.
- Gunakan library validasi yang sudah teruji (`zod`) daripada membangun validator custom sendiri.
- Struktur folder dan penamaan file konsisten dan mudah ditelusuri, tanpa over-engineering.

### 9.3 DRY (Don't Repeat Yourself)
- Karena modul **Produk** dan **Kategori** memiliki pola CRUD yang mirip, BE menyediakan **generic CRUD service/repository** (berbasis Prisma) yang dipakai ulang oleh kedua modul, dengan skema validasi berbeda per modul.
- Middleware RBAC (pengecekan role `admin`/`super_admin`) dan middleware autentikasi JWT dibuat satu kali sebagai reusable middleware, dipakai di seluruh route yang membutuhkan — bukan duplikasi logic per route.
- Di FE, logic fetch/loading/error state yang berulang (list produk, list kategori) diekstrak ke custom hook reusable (mis. `useCrud` atau `useFetch`), bukan ditulis ulang di tiap halaman.

### 9.4 TypeScript & ESM
- Semua file backend menggunakan ekstensi `.ts` dan dijalankan dengan `tsx` (development) atau di-compile ke `.js` via `tsc` (production).
- `tsconfig.json` wajib menggunakan `"module": "ESNext"` dan `"moduleResolution": "bundler"` sesuai kebutuhan Prisma v7.
- Import antar file menggunakan ekstensi `.js` (ESM convention): `import { prisma } from "../config/prisma.js"`.