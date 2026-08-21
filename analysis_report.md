# Laporan Analisis SRS — Backend E-Katalog UMKM Desa Pasiragung

> [!NOTE]
> **Versi 3.0** — Diperbarui: Prisma v7 + TypeScript + ESM.
> Berdasarkan [dokumentasi resmi Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7).

---

## 1. Ringkasan Arsitektur Backend

```mermaid
graph LR
    FE["React FE (Vercel)"] -->|axios / HTTPS| BE["Express BE (Railway)"]
    BE -->|"Prisma v7 + @prisma/adapter-pg"| DB[(PostgreSQL)]
    BE -->|multer → sharp → WebP| CLD["Cloudinary"]
    BE -->|Nodemailer / SMTP| EMAIL["Email Service"]
```

| Komponen | Stack | Catatan |
|---|---|---|
| **Language** | **TypeScript** | ESM-first (`"type": "module"` di package.json) |
| Runtime | Node.js + ExpressJS | — |
| ORM | **Prisma v7** | Rust-free client (TS/WASM), wajib pakai **driver adapter** |
| DB Adapter | **@prisma/adapter-pg** + **pg** | Connection pool via `pg.Pool`, bukan built-in Prisma engine |
| Database | PostgreSQL | — |
| Auth | JWT (stateless) + bcrypt | — |
| Upload | multer → sharp (convert WebP) → **Cloudinary** | Memory storage (buffer), tidak menyentuh filesystem |
| Validasi | zod | Rekomendasi SRS §9.2 |
| Rate Limiting | express-rate-limit | — |
| Email | **Nodemailer** (SMTP) | Kirim kode verifikasi email |
| Deploy | Railway | — |

### Nama Repo
| Repo | Nama |
|---|---|
| **Backend** | `api-katalog-pasiragung` |
| **Frontend** | `e-katalog-pasiragung` |

---

## 2. Perubahan Penting — Prisma v7 vs v5/v6

> [!WARNING]
> Prisma v7 memiliki **banyak breaking changes** dibanding v5/v6. Berikut daftar lengkap yang perlu diperhatikan:

| # | Perubahan | Prisma v5/v6 | Prisma v7 |
|---|---|---|---|
| 1 | **Provider** | `prisma-client-js` | `prisma-client` |
| 2 | **Output** | Otomatis ke `node_modules` | **Wajib eksplisit** (mis. `../src/generated/prisma`) |
| 3 | **Import path** | `from "@prisma/client"` | `from "./generated/prisma/client.js"` |
| 4 | **Driver adapter** | Opsional / tidak perlu | **Wajib** (`@prisma/adapter-pg` untuk PostgreSQL) |
| 5 | **DB URL config** | Di `schema.prisma` (`url = env(...)`) | Di **`prisma.config.ts`** (file baru di root) |
| 6 | **Module system** | CommonJS | **ESM-first** (`"type": "module"`) |
| 7 | **Client middleware** | `prisma.$use(...)` | **Dihapus** → gunakan Client Extensions |
| 8 | **Seed** | `ts-node prisma/seed.ts` | **`tsx prisma/seed.ts`** (konfigurasi di `prisma.config.ts`) |
| 9 | **`prisma generate`** | Otomatis saat `migrate dev` | **Harus dijalankan manual** setelah `migrate dev` |
| 10 | **Env loading** | Otomatis dari `.env` | **Manual** — harus `import "dotenv/config"` |
| 11 | **tsconfig** | Bebas | Wajib: `module: "ESNext"`, `moduleResolution: "bundler"` |

---

## 3. Konfigurasi Project — File-file Kunci

### 3.1 `package.json`

```json
{
  "name": "api-katalog-pasiragung",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "npx prisma generate",
    "prisma:migrate": "npx prisma migrate dev",
    "prisma:seed": "npx prisma db seed",
    "prisma:studio": "npx prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^7.x",
    "@prisma/adapter-pg": "^7.x",
    "pg": "^8.x",
    "express": "^5.x",
    "@types/express": "^5.x",
    "bcryptjs": "^3.x",
    "@types/bcryptjs": "^3.x",
    "jsonwebtoken": "^9.x",
    "@types/jsonwebtoken": "^9.x",
    "cors": "^2.x",
    "@types/cors": "^2.x",
    "multer": "^1.x",
    "@types/multer": "^1.x",
    "sharp": "^0.33.x",
    "cloudinary": "^2.x",
    "zod": "^3.x",
    "express-rate-limit": "^7.x",
    "nodemailer": "^6.x",
    "@types/nodemailer": "^6.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "prisma": "^7.x",
    "typescript": "^5.9.x",
    "tsx": "^4.x",
    "nodemon": "^3.x",
    "@types/pg": "^8.x",
    "@types/node": "^22.x"
  }
}
```

> [!IMPORTANT]
> - `"type": "module"` — **wajib** untuk Prisma v7 (ESM-first)
> - `tsx` menggantikan `ts-node` — lebih reliable untuk ESM
> - `@types/*` packages untuk type safety di TypeScript

### 3.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@generated/*": ["./src/generated/*"]
    }
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 `prisma.config.ts` (FILE BARU — wajib di Prisma v7)

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Lokasi schema utama
  schema: "prisma/schema.prisma",

  // Konfigurasi migrations & seed
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  // Database URL — dikelola di sini, BUKAN di schema.prisma
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

> [!CAUTION]
> Di Prisma v7, `url = env("DATABASE_URL")` di `schema.prisma` **sudah deprecated**. Semua konfigurasi connection pindah ke `prisma.config.ts`. Jangan taruh URL di `schema.prisma`.

---

## 4. Prisma Schema — Updated untuk v7

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URL tidak di sini lagi — dikonfigurasi di prisma.config.ts
}

enum Role {
  super_admin
  admin
}

enum AccountStatus {
  pending
  awaiting_verification
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
  password                    String
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
  imagePublicId          String?          @map("image_public_id")
  stockStatus            StockStatus      @map("stock_status")
  categoryId             String           @map("category_id")
  whatsappNumber         String           @map("whatsapp_number")
  description            String           @db.Text
  ownerName              String           @map("owner_name")
  productionSystem       ProductionSystem @map("production_system")
  netWeight              String           @map("net_weight")
  price                  Decimal          @db.Decimal(12, 2)
  flavorVariants         Json             @map("flavor_variants")
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

**Perbedaan dari v5/v6:**
- `provider` berubah: `"prisma-client-js"` → `"prisma-client"`
- `output` wajib: `"../src/generated/prisma"` (relatif dari `schema.prisma`)
- `url` dihapus dari `datasource db` — pindah ke `prisma.config.ts`

---

## 5. Prisma Client Instance — Cara Baru (v7)

```typescript
// src/config/prisma.ts

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// Buat connection pool via driver pg (bukan Prisma engine)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Atur connection pool sesuai kebutuhan
  max: 10,                     // max connections
  connectionTimeoutMillis: 5000, // timeout 5 detik (default pg: 0 / unlimited)
  idleTimeoutMillis: 30000,    // idle timeout 30 detik
});

// Buat adapter
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient dengan adapter (WAJIB di v7)
export const prisma = new PrismaClient({ adapter });
```

> [!WARNING]
> **Connection pool**: Di Prisma v7, pool dikelola oleh driver `pg` langsung, bukan oleh Prisma engine. Default `pg` tidak punya connection timeout (0), sedangkan Prisma v6 default-nya 5 detik. **Selalu atur `connectionTimeoutMillis`** untuk menghindari hang.

---

## 6. Peta Lengkap Endpoint (20 endpoint)

### 6.1 Auth Module — 6 endpoint

| # | Method | Endpoint | Akses | Request Body / Params | Response Sukses | Catatan |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/auth/register` | Publik | `{ name, email, password }` | `201` — `{ registration_token }` | `role: admin`, `status: pending` |
| 2 | `GET` | `/api/auth/status/:token` | Publik (token-bound) | Param: `token` | `200` — `{ status }` | Status: `pending` / `awaiting_verification` / `approved` / `rejected` |
| 3 | `POST` | `/api/auth/status/:token/verify` | Publik (token-bound) | `{ verification_code }` | `200` — `{ message }` | Cek hash, expiry, attempts. **Tidak return JWT** |
| 4 | `POST` | `/api/auth/status/:token/resend` | Publik (token-bound) | — | `200` — `{ message }` | Resend kode. Hanya jika `status: awaiting_verification` |
| 5 | `POST` | `/api/auth/login` | Publik | `{ email, password }` | `200` — `{ token, user }` | Hanya jika `status: approved` |
| 6 | `GET` | `/api/auth/me` | Authenticated | Header: `Bearer <JWT>` | `200` — `{ user }` | — |

### 6.2 Admin Management Module — 5 endpoint

| # | Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|---|
| 7 | `GET` | `/api/admin/requests` | super_admin | Daftar user pending |
| 8 | `PATCH` | `/api/admin/requests/:id/approve` | super_admin | Approve → `awaiting_verification` + kirim email kode |
| 9 | `PATCH` | `/api/admin/requests/:id/reject` | super_admin | Reject user (dari `pending` atau `awaiting_verification`) |
| 10 | `GET` | `/api/admin/users` | super_admin | Daftar semua admin |
| 11 | `DELETE` | `/api/admin/users/:id` | super_admin | Hard delete (cek FK produk dulu) |

### 6.3 Categories Module — 4 endpoint

| # | Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|---|
| 12 | `GET` | `/api/categories` | Publik | List kategori (pagination opsional) |
| 13 | `POST` | `/api/categories` | admin, super_admin | Tambah kategori |
| 14 | `PUT` | `/api/categories/:id` | admin, super_admin | Update kategori |
| 15 | `DELETE` | `/api/categories/:id` | admin, super_admin | Hapus (409 jika masih dipakai) |

### 6.4 Products Module — 5 endpoint

| # | Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|---|
| 16 | `GET` | `/api/products` | Publik | List + filter `?category=&stock_status=&search=&page=&limit=` |
| 17 | `GET` | `/api/products/:id` | Publik | Detail produk |
| 18 | `POST` | `/api/products` | admin, super_admin | Create (multipart, upload → Cloudinary) |
| 19 | `PUT` | `/api/products/:id` | admin, super_admin | Update (gambar opsional) |
| 20 | `DELETE` | `/api/products/:id` | admin, super_admin | Hard delete + hapus dari Cloudinary |

### 6.5 Format Response Pagination

```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

---

## 7. Struktur Folder Backend (TypeScript + Prisma v7)

```
api-katalog-pasiragung/
├── prisma/
│   ├── schema.prisma             # Model/enum definitions (tanpa URL)
│   ├── seed.ts                   # Seed super_admin (TypeScript)
│   └── migrations/
├── prisma.config.ts              # [BARU v7] Konfigurasi CLI (URL, seed, migrations)
├── tsconfig.json                 # ESM config
├── package.json                  # "type": "module"
├── src/
│   ├── generated/
│   │   └── prisma/               # [BARU v7] Output prisma generate (auto-generated, gitignored)
│   │       └── client.js         # PrismaClient di sini
│   ├── server.ts                 # Entry point
│   ├── app.ts                    # Express app setup
│   ├── config/
│   │   ├── index.ts              # barrel file
│   │   ├── env.ts                # Environment variables + validation (zod)
│   │   ├── cors.ts               # CORS config
│   │   ├── cloudinary.ts         # Cloudinary config
│   │   └── prisma.ts             # PrismaClient + adapter-pg + Pool
│   ├── middlewares/
│   │   ├── index.ts              # barrel file
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── role.middleware.ts    # RBAC guard
│   │   ├── upload.middleware.ts  # multer config (memory storage)
│   │   ├── rateLimiter.middleware.ts
│   │   └── errorHandler.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validation.ts
│   │   ├── admin/
│   │   │   ├── index.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── admin.validation.ts
│   │   ├── category/
│   │   │   ├── index.ts
│   │   │   ├── category.routes.ts
│   │   │   ├── category.controller.ts
│   │   │   ├── category.service.ts
│   │   │   └── category.validation.ts
│   │   └── product/
│   │       ├── index.ts
│   │       ├── product.routes.ts
│   │       ├── product.controller.ts
│   │       ├── product.service.ts
│   │       └── product.validation.ts
│   ├── shared/
│   │   ├── index.ts              # barrel file
│   │   ├── baseCrud.service.ts   # Generic CRUD (DRY)
│   │   ├── cloudinary.util.ts   # Upload/delete Cloudinary
│   │   ├── imageProcessor.ts    # sharp WebP conversion
│   │   ├── emailService.ts      # Nodemailer wrapper
│   │   ├── hashUtils.ts         # bcrypt, constant-time compare
│   │   ├── tokenUtils.ts        # JWT sign/verify, random token gen
│   │   ├── paginationUtils.ts   # Helper pagination
│   │   └── apiResponse.ts       # Standard response format
│   └── routes/
│       └── index.ts              # Mount all module routes
├── .env
├── .env.example
├── .gitignore                    # Include: src/generated/, dist/
└── README.md
```

> [!IMPORTANT]
> **Folder `src/generated/prisma/`** — Ini di-generate otomatis oleh `npx prisma generate`. **Masukkan ke `.gitignore`** karena bisa di-generate ulang kapan saja. Jangan edit file di dalamnya.

---

## 8. Seed Script — TypeScript (Prisma v7)

```typescript
// prisma/seed.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: "super_admin" },
  });

  if (existingSuperAdmin) {
    console.log("✅ Super admin already exists, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!",
    12
  );

  const superAdmin = await prisma.user.create({
    data: {
      name: process.env.SUPER_ADMIN_NAME || "Super Admin",
      email: process.env.SUPER_ADMIN_EMAIL || "admin@pasiragung.desa.id",
      password: hashedPassword,
      role: "super_admin",
      status: "approved",
      registrationToken: crypto.randomBytes(32).toString("hex"),
    },
  });

  console.log(`✅ Super admin created: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

> Jalankan: `npx prisma db seed`

---

## 9. Alur Setup Prisma v7 dari Nol (Step-by-Step)

```mermaid
graph TD
    A["1. npm init -y"] --> B["2. Install dependencies"]
    B --> C["3. Buat prisma.config.ts"]
    C --> D["4. npx prisma init"]
    D --> E["5. Edit schema.prisma<br/>(provider, output, models)"]
    E --> F["6. Setup .env<br/>(DATABASE_URL)"]
    F --> G["7. npx prisma migrate dev<br/>--name init"]
    G --> H["8. npx prisma generate"]
    H --> I["9. Buat src/config/prisma.ts<br/>(adapter + Pool)"]
    I --> J["10. npx prisma db seed"]

    style C fill:#ff9800,color:#000
    style H fill:#ff9800,color:#000
    style I fill:#ff9800,color:#000
```

### Langkah Detail:

**Step 1–2: Inisialisasi project**
```bash
npm init -y
npm install @prisma/client@7 @prisma/adapter-pg pg express bcryptjs jsonwebtoken cors multer sharp cloudinary zod express-rate-limit nodemailer dotenv
npm install -D prisma@7 typescript tsx nodemon @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/multer @types/nodemailer @types/pg
```

**Step 3: Buat `prisma.config.ts`** (lihat §3.3 di atas)

**Step 4: Inisialisasi Prisma**
```bash
npx prisma init
```

**Step 5: Edit `schema.prisma`** — Ganti provider & output, hapus URL, tambah model (lihat §4)

**Step 6: Setup `.env`**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ekatalog_pasiragung
```

**Step 7: Jalankan migration pertama**
```bash
npx prisma migrate dev --name init
```

**Step 8: Generate Prisma Client** ⚠️ DI V7 HARUS MANUAL
```bash
npx prisma generate
```

**Step 9: Buat Prisma client instance** (lihat §5 — `src/config/prisma.ts`)

**Step 10: Seed super_admin**
```bash
npx prisma db seed
```

> [!CAUTION]
> **Urutan penting!** Di Prisma v7, `migrate dev` dan `db push` **tidak lagi otomatis menjalankan `prisma generate`**. Anda harus selalu jalankan `npx prisma generate` secara manual setelah migration.

---

## 10. Diagram Alur Status User

```mermaid
stateDiagram-v2
    [*] --> pending: POST /register
    pending --> awaiting_verification: PATCH /approve (super_admin)
    pending --> rejected: PATCH /reject (super_admin)
    awaiting_verification --> approved: POST /verify (kode benar)
    awaiting_verification --> awaiting_verification: POST /resend (kirim ulang kode)
    awaiting_verification --> rejected: PATCH /reject (super_admin)
    rejected --> [*]: DELETE /users/:id (hard delete)
    approved --> [*]: DELETE /users/:id (hard delete)
```

### Aturan transisi yang HARUS ditaati:

| Dari | Ke | Trigger |
|---|---|---|
| `pending` | `awaiting_verification` | Super admin approve |
| `pending` | `rejected` | Super admin reject |
| `awaiting_verification` | `approved` | User submit kode benar |
| `awaiting_verification` | `awaiting_verification` | Resend kode |
| `awaiting_verification` | `rejected` | Super admin reject |

**Transisi yang TIDAK BOLEH terjadi:**
- ❌ `approved` → `pending`
- ❌ `rejected` → `approved`
- ❌ `pending` → `approved` (harus lewat `awaiting_verification`)

---

## 11. Middleware

| Middleware | Deskripsi | Dipakai di |
|---|---|---|
| `authMiddleware` | Verifikasi JWT | Semua endpoint admin & `/api/auth/me` |
| `roleMiddleware("super_admin")` | Cek role super_admin | `/api/admin/*` |
| `roleMiddleware("admin", "super_admin")` | Cek role admin/super_admin | CRUD kategori & produk (POST/PUT/DELETE) |
| `rateLimiter` | Rate limiting | `register`, `login`, `verify`, `resend` |
| `uploadMiddleware` | multer (memory storage) | `POST/PUT /api/products` |
| `corsMiddleware` | CORS (FE origin) | Global |
| `errorHandler` | Error handler JSON | Global |

---

## 12. Environment Variables

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

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email@example.com
SMTP_PASS=your-email-password
SMTP_FROM='"E-Katalog Pasiragung" <noreply@pasiragung.desa.id>'

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Verification
VERIFICATION_CODE_LENGTH=8
VERIFICATION_CODE_EXPIRY_MINUTES=15
VERIFICATION_MAX_ATTEMPTS=5
VERIFICATION_RESEND_MAX_PER_HOUR=3

# Super Admin Seed
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=admin@pasiragung.desa.id
SUPER_ADMIN_PASSWORD=SuperAdmin123!
```

---

## 13. Aturan Validasi per Endpoint

### Register
| Field | Aturan |
|---|---|
| `name` | Wajib, string, tidak kosong |
| `email` | Wajib, format email valid, unik |
| `password` | Wajib, min 8 karakter |

### Verify Code
| Validasi | Aturan |
|---|---|
| `verification_code` | Wajib. Hash → constant-time compare |
| Cek expiry | `expires_at > now()` |
| Cek attempts | `< 5`, lalu lockout |
| Cek status | Harus `awaiting_verification` |

### Resend Code
| Validasi | Aturan |
|---|---|
| Cek status | Harus `awaiting_verification` |
| Cooldown | Tidak bisa resend jika kode belum expired & attempts belum maks |
| Rate limit | Maks 3 resend per jam per token |

### Login
| Validasi | Aturan |
|---|---|
| `email` + `password` | Wajib. bcrypt compare. Status harus `approved` |

### Create/Update Product
| Field | Wajib? | Aturan |
|---|---|---|
| `name` | ✅ | String, tidak kosong |
| `image` | ✅ create / ❌ update | jpg/jpeg/png, maks 5MB → WebP → Cloudinary |
| `stock_status` | ✅ | `tersedia` \| `belum_tersedia` |
| `category_id` | ✅ | FK valid |
| `whatsapp_number` | ✅ | Regex: `+62` atau `08` + digit |
| `description` | ✅ | Text |
| `owner_name` | ✅ | String |
| `production_system` | ✅ | `pre_order` \| `ready_stock` |
| `net_weight` | ✅ | String |
| `price` | ✅ | Angka positif |
| `flavor_variants` | ✅ | JSON array `[{name, description}]`, min 1 |
| `composition` | ✅ | Text |
| `nib_number` | ❌ | Numerik, maks 13 digit |
| `halal_certificate_number` | ❌ | 2 huruf + 15 digit = 17 karakter |

### Delete Category
| Validasi | Aturan |
|---|---|
| Cek relasi | Ada produk? → **409 Conflict** |

---

## 14. Analisis Risiko & Mitigasi

### 14.1 Resend Verification Code

| Risiko | Mitigasi |
|---|---|
| Spam resend → inbox dibanjiri | Rate limit: maks 3 resend/jam/token. Cooldown jika kode belum expired |
| Kode lama masih valid | Invalidate kode lama sebelum generate baru |
| SMTP down saat resend | Transactional: kirim email → jika berhasil → simpan hash. Jika gagal → rollback |

### 14.2 Hard Delete

| Risiko | Mitigasi |
|---|---|
| Data hilang permanen | Modal konfirmasi di FE |
| Gambar orphan di Cloudinary | Hapus dari Cloudinary berdasarkan `image_public_id` sebelum delete DB |
| User punya produk (FK) | Tolak delete dengan **409** — "Reassign/hapus produknya dulu" |
| Tidak ada audit trail | Acceptable untuk MVP (KISS). Bisa tambah `audit_logs` nanti |

### 14.3 Nodemailer

| Risiko | Mitigasi |
|---|---|
| SMTP credentials bocor | `.env` di `.gitignore`. Env vars di Railway |
| Email masuk spam | Pakai SMTP provider bereputasi (Brevo/Resend). Set SPF/DKIM |
| SMTP down | Retry 1-2x. Jika gagal → rollback status + return error |

| Environment | SMTP Provider |
|---|---|
| Development | **Mailtrap** (sandbox, email tidak terkirim asli) |
| Production | **Brevo** (300 email/hari gratis) atau **Resend** (100/hari gratis) |

---

## 15. Urutan Pengerjaan Backend

### Sprint 1 — Fondasi + Auth + Verifikasi
```
1. [ ] npm init, install deps, setup tsconfig.json, package.json (ESM)
2. [ ] Buat prisma.config.ts
3. [ ] Setup schema.prisma (provider: prisma-client, output, models)
4. [ ] npx prisma migrate dev --name init
5. [ ] npx prisma generate (MANUAL!)
6. [ ] Buat src/config/prisma.ts (adapter-pg + Pool)
7. [ ] Seed super_admin (npx prisma db seed)
8. [ ] Config: CORS, Cloudinary, Nodemailer, env validation (zod)
9. [ ] Middleware: error handler, rate limiter, auth, role
10.[ ] Auth module: register, login, me, status, verify, resend
11.[ ] Test semua via Postman
```

### Sprint 2 — Admin Management + Kategori
```
1. [ ] Admin module: requests, approve, reject, users, delete
2. [ ] Category module: GET, POST, PUT, DELETE (+409)
3. [ ] Generic CRUD service (baseCrud.service.ts)
4. [ ] Test via Postman
```

### Sprint 3 — Produk (CRUD + Cloudinary)
```
1. [ ] Upload middleware (multer memory)
2. [ ] Image processor (sharp → WebP)
3. [ ] Cloudinary util (upload/delete)
4. [ ] Product module: list (filter+search+pagination), detail, create, update, delete
5. [ ] Test via Postman
```

### Sprint 4 — Polish & Deploy
```
1. [ ] Final security review (SRS §5.1 checklist)
2. [ ] Switch SMTP ke production
3. [ ] Deploy ke Railway
4. [ ] Dokumentasi API
```

---

## 16. Dependencies Summary

```json
{
  "dependencies": {
    "@prisma/client": "^7.x",
    "@prisma/adapter-pg": "^7.x",
    "pg": "^8.x",
    "express": "^5.x",
    "bcryptjs": "^3.x",
    "jsonwebtoken": "^9.x",
    "cors": "^2.x",
    "multer": "^1.x",
    "sharp": "^0.33.x",
    "cloudinary": "^2.x",
    "zod": "^3.x",
    "express-rate-limit": "^7.x",
    "nodemailer": "^6.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "prisma": "^7.x",
    "typescript": "^5.9.x",
    "tsx": "^4.x",
    "nodemon": "^3.x",
    "@types/node": "^22.x",
    "@types/express": "^5.x",
    "@types/pg": "^8.x",
    "@types/bcryptjs": "^3.x",
    "@types/jsonwebtoken": "^9.x",
    "@types/cors": "^2.x",
    "@types/multer": "^1.x",
    "@types/nodemailer": "^6.x"
  }
}
```

---

## 17. Semua Keputusan — RESOLVED

| # | Keputusan | Status |
|---|---|---|
| 1 | Status `awaiting_verification` | ✅ RESOLVED |
| 2 | Super admin via Prisma seed | ✅ RESOLVED |
| 3 | Image storage → Cloudinary | ✅ RESOLVED |
| 4 | Pagination (products wajib, categories opsional) | ✅ RESOLVED |
| 5 | Search by nama (`?search=` + ILIKE) | ✅ RESOLVED |
| 6 | Resend verification code endpoint | ✅ RESOLVED |
| 7 | Hard delete + FK constraint check | ✅ RESOLVED |
| 8 | Nodemailer (Mailtrap dev, Brevo prod) | ✅ RESOLVED |
| 9 | **Prisma v7 + TypeScript + ESM** | ✅ RESOLVED |
| 10 | **Driver adapter (@prisma/adapter-pg)** | ✅ RESOLVED |
| 11 | **prisma.config.ts** | ✅ RESOLVED |
| 12 | **Seed via tsx** | ✅ RESOLVED |
