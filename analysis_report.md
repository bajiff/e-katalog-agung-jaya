# Laporan Analisis SRS — Backend E-Katalog UMKM Desa Pasiragung

> [!NOTE]
> Analisis ini disusun berdasarkan **SRS v1.0**, **PRD v1.0**, dan **SDLC v1.0**. Fokus utama: menyiapkan peta kerja backend (`api-katalog-pasirasung`) agar Anda bisa langsung menyusun kode BE secara terstruktur.

---

## 1. Ringkasan Arsitektur Backend

```mermaid
graph LR
    FE["React FE (Vercel)"] -->|axios / HTTPS| BE["Express BE (Railway)"]
    BE -->|Prisma ORM| DB[(PostgreSQL)]
    BE -->|multer → sharp → WebP| FS["Image Storage"]
```

| Komponen | Stack |
|---|---|
| Runtime | Node.js + ExpressJS |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (stateless) + bcrypt |
| Upload | multer → sharp (convert WebP) |
| Validasi | zod / express-validator (rekomendasi SRS §9.2) |
| Rate Limiting | express-rate-limit |
| Deploy | Railway |

---

## 2. Peta Lengkap Endpoint (17 endpoint)

### 2.1 Auth Module — 5 endpoint

| # | Method | Endpoint | Akses | Request Body / Params | Response Sukses | Catatan Penting |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/auth/register` | Publik | `{ name, email, password }` | `201` — `{ registration_token }` | Otomatis `role: admin`, `status: pending`. Generate `registration_token` unik & panjang |
| 2 | `GET` | `/api/auth/status/:token` | Publik (token-bound) | Param: `token` (registration_token) | `200` — `{ status: "pending" / "approved" / "rejected" }` | Tidak boleh bocorkan data user lain |
| 3 | `POST` | `/api/auth/status/:token/verify` | Publik (token-bound) | `{ verification_code }` | `200` — `{ message: "verified" }` | Validasi hash kode, cek expiry, cek attempts. **Tidak menghasilkan JWT** |
| 4 | `POST` | `/api/auth/login` | Publik | `{ email, password }` | `200` — `{ token (JWT), user }` | Hanya berhasil jika `status: approved`. Return JWT |
| 5 | `GET` | `/api/auth/me` | Authenticated | Header: `Authorization: Bearer <JWT>` | `200` — `{ user data }` | Data profil user yang sedang login |

### 2.2 Admin Management Module — 5 endpoint (super_admin only)

| # | Method | Endpoint | Akses | Request Body / Params | Response Sukses | Catatan Penting |
|---|---|---|---|---|---|---|
| 6 | `GET` | `/api/admin/requests` | super_admin | — | `200` — `[{ users with status: pending }]` | Daftar pending approval |
| 7 | `PATCH` | `/api/admin/requests/:id/approve` | super_admin | Param: `id` (user id) | `200` — `{ message }` | Generate kode verifikasi → hash & simpan → kirim email kode asli. Status belum final `approved` sampai user verifikasi kode |
| 8 | `PATCH` | `/api/admin/requests/:id/reject` | super_admin | Param: `id` (user id) | `200` — `{ message }` | Ubah status → `rejected` |
| 9 | `GET` | `/api/admin/users` | super_admin | — | `200` — `[{ all admin users }]` | Daftar seluruh admin |
| 10 | `DELETE` | `/api/admin/users/:id` | super_admin | Param: `id` (user id) | `200` — `{ message }` | Nonaktifkan / hapus akun admin |

### 2.3 Categories Module — 4 endpoint

| # | Method | Endpoint | Akses | Request Body / Params | Response Sukses | Catatan Penting |
|---|---|---|---|---|---|---|
| 11 | `GET` | `/api/categories` | Publik | — | `200` — `[{ id, name }]` | Dipakai FE publik (filter) & FE admin (dropdown) |
| 12 | `POST` | `/api/categories` | admin, super_admin | `{ name }` | `201` — `{ category }` | Nama harus unik |
| 13 | `PUT` | `/api/categories/:id` | admin, super_admin | `{ name }` | `200` — `{ category }` | — |
| 14 | `DELETE` | `/api/categories/:id` | admin, super_admin | Param: `id` | `200` — `{ message }` | **Tolak dengan `409` jika kategori masih dipakai produk** |

### 2.4 Products Module — 5 endpoint

| # | Method | Endpoint | Akses | Request Body / Params | Response Sukses | Catatan Penting |
|---|---|---|---|---|---|---|
| 15 | `GET` | `/api/products` | Publik | Query: `?category=&stock_status=` | `200` — `[{ products }]` | Mendukung filter kategori & status stok |
| 16 | `GET` | `/api/products/:id` | Publik | Param: `id` | `200` — `{ product detail }` | Seluruh field termasuk `flavor_variants` |
| 17 | `POST` | `/api/products` | admin, super_admin | `multipart/form-data` | `201` — `{ product }` | Upload gambar wajib. `created_by` diisi dari JWT |
| 18 | `PUT` | `/api/products/:id` | admin, super_admin | `multipart/form-data` | `200` — `{ product }` | Gambar opsional saat update |
| 19 | `DELETE` | `/api/products/:id` | admin, super_admin | Param: `id` | `200` — `{ message }` | Hapus gambar fisik juga |

> Total: **19 endpoint** (SRS ringkasan menuliskan 17, tapi setelah dihitung detail ada 19 — ini karena SRS lampiran §7 menggabungkan beberapa)

---

## 3. Prisma Schema (Database Model)

Berikut blueprint Prisma schema yang diturunkan langsung dari SRS §3:

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  super_admin
  admin
}

enum AccountStatus {
  pending
  approved
  rejected
}

enum StockStatus {
  tersedia
  belum_tersedia
}

enum ProductionSystem {
  pre_order
  ready_stock
}

model User {
  id                          String        @id @default(uuid())
  name                        String
  email                       String        @unique
  password                    String        // hashed with bcrypt
  role                        Role          @default(admin)
  status                      AccountStatus @default(pending)
  registrationToken           String        @unique @map("registration_token")
  verificationCodeHash        String?       @map("verification_code_hash")
  verificationCodeExpiresAt   DateTime?     @map("verification_code_expires_at")
  verificationAttempts        Int           @default(0) @map("verification_attempts")
  createdAt                   DateTime      @default(now()) @map("created_at")
  updatedAt                   DateTime      @updatedAt @map("updated_at")
  products                    Product[]

  @@map("users")
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  products  Product[]

  @@map("categories")
}

model Product {
  id                     String           @id @default(uuid())
  name                   String
  imageUrl               String           @map("image_url")
  stockStatus            StockStatus      @map("stock_status")
  categoryId             String           @map("category_id")
  whatsappNumber         String           @map("whatsapp_number")
  description            String           @db.Text
  ownerName              String           @map("owner_name")
  productionSystem       ProductionSystem @map("production_system")
  netWeight              String           @map("net_weight")
  price                  Decimal          @db.Decimal(12, 2)
  flavorVariants         Json             @map("flavor_variants") // array of {name, description}
  composition            String           @db.Text
  nibNumber              String?          @map("nib_number")
  halalCertificateNumber String?          @map("halal_certificate_number")
  createdBy              String           @map("created_by")
  createdAt              DateTime         @default(now()) @map("created_at")
  updatedAt              DateTime         @updatedAt @map("updated_at")

  category Category @relation(fields: [categoryId], references: [id])
  creator  User     @relation(fields: [createdBy], references: [id])

  @@map("products")
}
```

---

## 4. Aturan Validasi per Endpoint

### 4.1 Register (`POST /api/auth/register`)

| Field | Aturan |
|---|---|
| `name` | Wajib, string, tidak kosong |
| `email` | Wajib, format email valid, **unik** di database |
| `password` | Wajib, minimal 8 karakter, disarankan kombinasi huruf & angka |

### 4.2 Verify Code (`POST /api/auth/status/:token/verify`)

| Field | Aturan |
|---|---|
| `verification_code` | Wajib |
| Validasi server-side | Hash input → compare constant-time vs `verification_code_hash` |
| Cek expiry | `verification_code_expires_at` harus > `now()` |
| Cek attempts | `verification_attempts` < batas (mis. 5x). Jika melebihi → lockout 15-30 menit atau wajib kirim ulang |

### 4.3 Login (`POST /api/auth/login`)

| Field | Aturan |
|---|---|
| `email` | Wajib, format valid |
| `password` | Wajib |
| Validasi server-side | User harus ada, password match (bcrypt compare), `status` harus `approved` |

### 4.4 Create/Update Product

| Field | Aturan | Wajib? |
|---|---|---|
| `name` | String, tidak kosong | ✅ |
| `image` | File: jpg/jpeg/png, maks 5MB. Dikonversi ke WebP oleh server | ✅ (create), opsional (update) |
| `stock_status` | Enum: `tersedia` \| `belum_tersedia` | ✅ |
| `category_id` | Harus merujuk ke kategori yang ada | ✅ |
| `whatsapp_number` | Regex: boleh diawali `+62` atau `08`, sisanya digit | ✅ |
| `description` | String/text, tidak kosong | ✅ |
| `owner_name` | String, tidak kosong | ✅ |
| `production_system` | Enum: `pre_order` \| `ready_stock` | ✅ |
| `net_weight` | String, tidak kosong (mis. "200 gram") | ✅ |
| `price` | Angka positif (decimal) | ✅ |
| `flavor_variants` | JSON array of `{name, description}`, minimal 1 varian | ✅ |
| `composition` | String/text, tidak kosong | ✅ |
| `nib_number` | Jika diisi: numerik, maks 13 digit | ❌ |
| `halal_certificate_number` | Jika diisi: 2 huruf (kode negara) + 15 digit = total 17 karakter | ❌ |

### 4.5 Create/Update Category

| Field | Aturan | Wajib? |
|---|---|---|
| `name` | String, tidak kosong, **unik** | ✅ |

### 4.6 Delete Category

| Validasi | Aturan |
|---|---|
| Cek relasi | Jika masih ada produk yang merujuk ke kategori ini → **tolak dengan HTTP 409** |

---

## 5. Middleware yang Dibutuhkan

```mermaid
graph TD
    REQ[Incoming Request] --> RL[Rate Limiter]
    RL --> CORS[CORS Middleware]
    CORS --> ROUTE{Route Type?}
    ROUTE -->|Public| HANDLER[Route Handler]
    ROUTE -->|Authenticated| AUTH[JWT Auth Middleware]
    AUTH --> RBAC{Role Check}
    RBAC -->|admin / super_admin| HANDLER
    RBAC -->|super_admin only| SA_CHECK[Super Admin Guard]
    SA_CHECK --> HANDLER
```

| Middleware | Deskripsi | Dipakai di |
|---|---|---|
| `authMiddleware` | Verifikasi JWT dari header `Authorization: Bearer <token>` | Semua endpoint admin & `GET /api/auth/me` |
| `roleMiddleware('super_admin')` | Cek role dari JWT payload = `super_admin` | Semua endpoint `/api/admin/*` |
| `roleMiddleware('admin', 'super_admin')` | Cek role admin atau super_admin | CRUD kategori (POST/PUT/DELETE) & CRUD produk (POST/PUT/DELETE) |
| `rateLimiter` | Rate limiting (express-rate-limit) | `register`, `login`, `status/:token/verify` |
| `uploadMiddleware` | multer config (file filter, size limit) | `POST /api/products`, `PUT /api/products/:id` |
| `corsMiddleware` | Izinkan origin FE Vercel + localhost (dev) | Global |
| `errorHandler` | Centralized error handler, response JSON konsisten | Global (app-level) |

---

## 6. Struktur Folder Backend (Rekomendasi sesuai SRS §9)

```
api-katalog-pasirasung/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js                  # Seed super_admin awal
│   └── migrations/
├── src/
│   ├── app.js                   # Express app setup
│   ├── server.js                # Entry point
│   ├── config/
│   │   ├── index.js             # barrel file
│   │   ├── env.js               # Environment variables
│   │   ├── cors.js              # CORS config
│   │   └── prisma.js            # Prisma client instance
│   ├── middlewares/
│   │   ├── index.js             # barrel file
│   │   ├── auth.middleware.js   # JWT verification
│   │   ├── role.middleware.js   # RBAC guard
│   │   ├── upload.middleware.js # multer config
│   │   ├── rateLimiter.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── index.js         # barrel file
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   ├── admin/
│   │   │   ├── index.js
│   │   │   ├── admin.routes.js
│   │   │   ├── admin.controller.js
│   │   │   ├── admin.service.js
│   │   │   └── admin.validation.js
│   │   ├── category/
│   │   │   ├── index.js
│   │   │   ├── category.routes.js
│   │   │   ├── category.controller.js
│   │   │   ├── category.service.js
│   │   │   └── category.validation.js
│   │   └── product/
│   │       ├── index.js
│   │       ├── product.routes.js
│   │       ├── product.controller.js
│   │       ├── product.service.js
│   │       └── product.validation.js
│   ├── shared/
│   │   ├── index.js             # barrel file
│   │   ├── baseCrud.service.js  # Generic CRUD (DRY — SRS §9.3)
│   │   ├── imageProcessor.js   # sharp WebP conversion
│   │   ├── hashUtils.js        # bcrypt, constant-time compare
│   │   ├── tokenUtils.js       # JWT sign/verify, random token gen
│   │   └── apiResponse.js      # Standard response format helper
│   └── routes/
│       └── index.js             # Mount all module routes
├── uploads/                     # WebP images (gitignored)
├── .env                         # DATABASE_URL, JWT_SECRET, etc.
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

> [!TIP]
> Sesuai SRS §9.3 (DRY), `baseCrud.service.js` adalah generic CRUD service berbasis Prisma yang dipakai ulang oleh modul **Category** dan **Product** — cukup beda di skema validasi.

---

## 7. Alur Kritis yang Perlu Diperhatikan

### 7.1 Alur Registrasi → Approval → Verifikasi → Login

Ini adalah alur paling kompleks di sistem. Berikut sequence lengkapnya:

```mermaid
sequenceDiagram
    participant User as Calon Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    participant Email as Email Service

    User->>FE: Isi form register
    FE->>BE: POST /api/auth/register
    BE->>DB: Create user (status: pending, generate registration_token)
    BE-->>FE: 201 { registration_token }
    FE->>FE: Redirect ke /status/:registration_token

    Note over FE: User menunggu di halaman status pending

    FE->>BE: GET /api/auth/status/:token (polling / revisit)
    BE-->>FE: { status: "pending" }

    Note over BE: Super Admin approve di dashboard

    BE->>DB: Generate kode verifikasi → hash → simpan hash + expiry
    BE->>Email: Kirim kode asli ke email user
    
    User->>FE: Buka halaman /status/:registration_token
    FE->>BE: GET /api/auth/status/:token
    BE-->>FE: { status: "pending", awaiting_verification: true }
    
    User->>FE: Input kode verifikasi
    FE->>BE: POST /api/auth/status/:token/verify { code }
    BE->>DB: Compare hash, cek expiry, cek attempts
    BE->>DB: Update status → approved, nullkan kode
    BE-->>FE: 200 { message: "verified, silakan login" }

    User->>FE: Login (email + password)
    FE->>BE: POST /api/auth/login
    BE-->>FE: 200 { token: JWT }
```

### 7.2 Upload & Proses Gambar

```mermaid
graph LR
    A[Client upload jpg/png ≤5MB] --> B[multer receive file]
    B --> C{Validasi tipe & ukuran}
    C -->|Invalid| D[Return 400 error]
    C -->|Valid| E[sharp: resize max 800px width]
    E --> F[sharp: convert to WebP]
    F --> G[Save to /uploads/]
    G --> H[Store path/URL in DB]
```

---

## 8. Environment Variables yang Dibutuhkan

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
# Production: https://e-katalog-pasiragung.vercel.app

# Email (untuk kirim kode verifikasi)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASS=your-email-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Verification
VERIFICATION_CODE_LENGTH=8
VERIFICATION_CODE_EXPIRY_MINUTES=15
VERIFICATION_MAX_ATTEMPTS=5
```

---

## 9. Temuan & Catatan dari Analisis

### 9.1 Konsistensi yang Perlu Diperhatikan

> [!WARNING]
> **Typo di nama repo BE**: SRS menyebut `api-katalog-pasirasung` (huruf "g" hilang dari "pasiragung"). PRD juga menulis hal yang sama. Pastikan ini memang disengaja atau perbaiki sebelum membuat repo.

> [!IMPORTANT]
> **Jumlah endpoint**: SRS lampiran §7 merangkum seolah ada 17 endpoint, tapi dari spesifikasi detail §4.1–§4.4 sebenarnya ada **19 endpoint** (5 auth + 5 admin + 4 kategori + 5 produk). Angka 17 bisa menyesatkan — gunakan tabel detail di bagian 2 laporan ini sebagai acuan.

### 9.2 Hal yang Belum Eksplisit di SRS (Perlu Keputusan)

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| 1 | **Status transisi saat approve**: Apakah status user tetap `pending` sampai verifikasi selesai, atau ada status antara (mis. `awaiting_verification`)? | SRS menyebut "approved-in-progress" di §4.2 tapi enum hanya punya `pending/approved/rejected`. **Rekomendasi: tambah status `awaiting_verification`** atau gunakan flag terpisah |
| 2 | **Bagaimana super_admin pertama dibuat?** Tidak ada endpoint untuk membuat super_admin. | **Rekomendasi: Prisma seed script** — buat super_admin pertama via `prisma db seed` |
| 3 | **Image storage**: Di mana file WebP disimpan? Lokal di server atau cloud storage? | SRS hanya menyebut "path/URL disimpan di database". Di Railway, **filesystem bersifat ephemeral** — file hilang saat redeploy. **Rekomendasi: gunakan cloud storage (Cloudinary / Supabase Storage / S3)** atau volume persist di Railway |
| 4 | **Pagination**: Endpoint list produk & list kategori perlu pagination? | SRS tidak menyebutkan. **Rekomendasi: implementasikan pagination** (`?page=&limit=`) dari awal untuk produk, opsional untuk kategori |
| 5 | **Search by nama produk**: SRS §4.5 menyebutnya "opsional/enhancement" | **Rekomendasi: tambahkan query `?search=`** di `GET /api/products` — implementasi sederhana dengan `ILIKE` di Prisma |
| 6 | **Resend verification code**: Bagaimana jika kode expired / attempts habis? Siapa yang trigger resend? | SRS menyebut "kirim ulang kode oleh super_admin/user" tapi tidak ada endpoint khusus. **Rekomendasi: tambah endpoint `POST /api/auth/status/:token/resend` atau buat super_admin bisa re-approve** |
| 7 | **Soft delete vs hard delete** untuk user & produk? | SRS tidak spesifik. **Rekomendasi: hard delete** untuk kesederhanaan (KISS §9.2), kecuali ada kebutuhan audit trail |
| 8 | **Email service**: Library apa untuk kirim email? | **Rekomendasi: Nodemailer** — paling populer untuk Node.js, gratis, support SMTP |

### 9.3 Potensi Risiko Teknis

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Railway ephemeral filesystem | File gambar hilang saat redeploy | Gunakan external storage (Cloudinary/Supabase) |
| Belum ada status `awaiting_verification` | Logic approval jadi ambigu — user status `pending` tapi sudah di-approve | Tambah enum value atau flag boolean |
| Rate limiting terlalu ketat di dev | Menghambat testing | Konfigurasi berbeda per environment |
| Kode verifikasi lewat email | Butuh SMTP provider (Mailtrap untuk dev, Brevo/Resend untuk prod) | Setup SMTP dari Sprint 1 |

---

## 10. Urutan Pengerjaan Backend (Sesuai SDLC Sprint Plan)

Berdasarkan SDLC §3.2, strategi **BE-first per modul**:

### Sprint 1 — Fondasi + Auth + Verifikasi Email
```
1. [ ] Setup project: npm init, install dependencies, folder structure
2. [ ] Setup Prisma + PostgreSQL + schema + migration
3. [ ] Seed super_admin pertama
4. [ ] Middleware: CORS, error handler, rate limiter
5. [ ] Auth module: register, login, me
6. [ ] Auth module: status/:token, status/:token/verify
7. [ ] Setup email service (Nodemailer)
8. [ ] Test semua endpoint auth via Postman
```

### Sprint 2 — Admin Management + Kategori + Security
```
1. [ ] Admin module: GET requests, PATCH approve, PATCH reject
2. [ ] Admin module: GET users, DELETE users/:id
3. [ ] Category module: GET, POST, PUT, DELETE (+ validasi 409)
4. [ ] Generic CRUD service (baseCrud.service.js)
5. [ ] Test semua endpoint via Postman
```

### Sprint 3 — Produk (CRUD + Upload Gambar)
```
1. [ ] Upload middleware (multer config)
2. [ ] Image processor (sharp → WebP)
3. [ ] Product module: GET list (+ filter), GET detail
4. [ ] Product module: POST (create + upload), PUT (update), DELETE
5. [ ] Test semua endpoint via Postman
```

### Sprint 4 — Polish & Deploy
```
1. [ ] Endpoint publik final check
2. [ ] Security hardening review (checklist SRS §5.1)
3. [ ] Deploy ke Railway
4. [ ] Dokumentasi API (README / Postman collection)
```

---

## 11. Dependencies (package.json) yang Direkomendasikan

```json
{
  "dependencies": {
    "express": "^4.x",
    "@prisma/client": "^5.x",
    "bcryptjs": "^2.x",
    "jsonwebtoken": "^9.x",
    "cors": "^2.x",
    "multer": "^1.x",
    "sharp": "^0.33.x",
    "zod": "^3.x",
    "express-rate-limit": "^7.x",
    "nodemailer": "^6.x",
    "dotenv": "^16.x",
    "crypto": "(built-in)"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "nodemon": "^3.x"
  }
}
```

---

> [!IMPORTANT]
> Pertanyaan di **bagian 9.2** (terutama #1 tentang status transisi, #3 tentang image storage, dan #6 tentang resend code) sebaiknya dijawab sebelum mulai coding, karena mempengaruhi struktur schema dan arsitektur.
