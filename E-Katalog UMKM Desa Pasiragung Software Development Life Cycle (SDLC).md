# Software Development Life Cycle (SDLC)

## E-Katalog UMKM Desa Pasiragung

### Metodologi: Agile — Framework Scrum

**Versi:** 1.0
**Tanggal:** 18 Agustus 2026
**Disusun oleh:** Mr. Baji
**Status:** Draft
**Dokumen acuan:** E-Katalog UMKMDesa Pasiragung Product Requirements Document (PRD).md, E-Katalog UMKM Desa Pasiragung Software Requirements Specification (SRS).md

---

## 1. Pendahuluan

Project ini dikerjakan oleh satu individu (self-directed) sebagai bagian dari PjBL KKM. Karena itu, framework Scrum di sini **diadaptasi untuk tim kecil/solo developer** — beberapa role digabung ke satu orang, namun ritual dan artifact Scrum tetap dijalankan agar progres tetap terstruktur dan terukur.

Catatan: pihak desa (perangkat desa/pengelola BUMDes) berperan sebagai **Product Owner tidak langsung**, karena merekalah yang akan menerima hasil akhir (handover) dan yang kebutuhannya diwakili dalam PRD/SRS.

---

## 2. Pilar 1 — Scrum Roles

|Role|Pemegang Peran|Tanggung Jawab|
|---|---|---|
|**Product Owner**|Mr. Baji (merangkap, mewakili kebutuhan pihak Desa Pasiragung/BUMDes)|Menentukan prioritas Product Backlog berdasarkan PRD, memastikan fitur yang dibangun sesuai kebutuhan pengguna akhir (perangkat desa & pengunjung katalog)|
|**Scrum Master**|Mr. Baji (merangkap)|Menjaga alur kerja Scrum tetap berjalan (sprint planning, tracking, retrospective), menghilangkan hambatan (mis. kendala teknis, keterbatasan waktu belajar)|
|**Development Team**|Mr. Baji (merangkap, sebagai Fullstack Developer: FE React + BE Express)|Mengerjakan implementasi sesuai SRS, memastikan kualitas kode, melakukan testing dasar sebelum deploy|
|**Stakeholder (di luar Scrum Team)**|Perangkat Desa Pasiragung / Pengelola BUMDes|Memberikan masukan di Sprint Review, pengguna akhir sistem (sebagai super_admin) setelah handover, penerima hasil akhir project|

> Karena tim terdiri dari satu orang, sebagian ritual (misalnya Daily Scrum) disesuaikan menjadi bentuk **self-check-in tertulis** (log harian singkat), bukan pertemuan tim.

---

## 3. Pilar 2 — Scrum Artifacts

### 3.1 Product Backlog

Daftar seluruh kebutuhan/fitur berdasarkan requirement di PRD & SRS, diurutkan berdasarkan prioritas. Contoh Product Backlog Item (PBI) awal:

| #             | Item                                                                       | Sumber         | Prioritas |
| ------------- | -------------------------------------------------------------------------- | -------------- | --------- |
| 1             | Setup project (FE React + BE Express + Prisma + PostgreSQL, struktur repo) | SRS §2, §6     | Tinggi    |
| 2             | Autentikasi: register, login, JWT                                          | SRS §4.1       | Tinggi    |
| 3             | Alur verifikasi email admin (token, kode, expiry)                          | SRS §4.1, §5.1 | Tinggi    |
| 4             | Manajemen approval admin oleh super_admin                                  | SRS §4.2       | Tinggi    |
| 5             | CRUD Kategori                                                              | SRS §4.3       | Sedang    |
| 6             | CRUD Produk (termasuk upload & kompresi gambar ke WebP)                    | SRS §4.4       | Tinggi    |
| 7             | Halaman katalog publik (list, detail, filter)                              | SRS §4.5       | Tinggi    |
| 8             | Integrasi tombol WhatsApp                                                  | SRS §4.5       | Sedang    |
| 9             | Setup CORS, rate limiting, security hardening                              | SRS §5, §5.1   | Tinggi    |
| 10            | Deployment (FE ke Vercel, BE ke Railway)                                   | PRD §8         | Sedang    |
| 11            | Dokumentasi penggunaan untuk handover ke desa                              | PRD §9         | Sedang    |
| 12 (opsional) | Notifikasi email approve/reject (FR-6b)                                    | SRS §6         | Rendah    |

### 3.2 Sprint Backlog

Subset dari Product Backlog yang dipilih untuk dikerjakan dalam satu sprint (ditentukan saat Sprint Planning). Contoh pembagian awal (durasi sprint disarankan **1-2 minggu**, menyesuaikan waktu belajar/kuliah):

**Strategi pengerjaan: BE-first per modul, bukan BE-first seluruhnya.** Karena FE bergantung pada struktur data & response API dari BE (bukan sebaliknya), tiap modul fitur dikerjakan dengan urutan berikut, sebelum berpindah ke modul lain — supaya tidak ada bug/anomali akibat FE dibangun di atas asumsi struktur data yang belum pasti:

1. **BE:** implementasi endpoint modul (sesuai kontrak di SRS §4).
2. **BE:** testing manual via Postman/Thunder Client — pastikan response sukses, response error, dan status code sesuai SRS untuk _setiap_ skenario (happy path + edge case, mis. input kosong, kode verifikasi salah, kategori masih dipakai produk).
3. **FE:** baru membangun halaman/form yang mengonsumsi endpoint tsb, memakai response yang sudah diverifikasi valid (bukan tebakan struktur data).
4. **Integrasi & regresi:** test end-to-end modul tsb (FE ↔ BE), termasuk memastikan modul yang sudah selesai sebelumnya tidak rusak (regression check) akibat perubahan di modul baru.
5. Modul dianggap benar-benar _done_ (lihat DoD §3.4) baru setelah langkah 1-4 lolos tanpa bug diketahui — baru lanjut ke modul berikutnya.

- **Sprint 1:** PBI #1, #2, #3 (fondasi: setup + auth + verifikasi email) — BE dulu (endpoint + test Postman), baru FE (form register, halaman status pending)
- **Sprint 2:** PBI #4, #5, #9 (approval admin, kategori, security hardening dasar) — BE dulu (endpoint approval + kategori + rate limiting), baru FE (dashboard approval, CRUD kategori)
- **Sprint 3:** PBI #6 (CRUD produk + upload gambar) — BE dulu (endpoint produk + upload + kompresi WebP), baru FE (form produk, list produk di dashboard admin)
- **Sprint 4:** PBI #7, #8 (katalog publik + WhatsApp) — BE dulu (endpoint publik + filter), baru FE (halaman katalog publik)
- **Sprint 5:** PBI #10, #11, #12 (deployment, dokumentasi, enhancement opsional)

### 3.3 Increment

Hasil kerja yang sudah selesai (_done_) di akhir tiap sprint dan dapat didemokan/dijalankan — misalnya di akhir Sprint 1, fitur register+login+verifikasi email sudah bisa dites end-to-end meskipun fitur lain belum ada.

### 3.4 Definition of Done (DoD)

Sebuah PBI dianggap selesai jika:

- Kode sudah diimplementasi sesuai requirement SRS terkait.
- Sudah diuji manual (functional testing) minimal untuk alur utama (happy path) **dan** alur gagal/edge case (mis. input kosong, format salah, kode verifikasi kedaluwarsa/salah, akses tanpa role yang sesuai).
- Regression check dilakukan — modul yang sudah selesai sebelumnya dites ulang sekilas untuk memastikan tidak rusak akibat perubahan modul baru.
- Tidak ada error/bug blocking yang diketahui, dan tidak ada anomali pada response API (status code, format JSON, pesan error konsisten dengan SRS §4).
- Untuk fitur keamanan (auth, verifikasi email, RBAC): sudah dicek terhadap daftar mitigasi di SRS §5.1.
- Kode sudah di-push ke repository terkait (`e-katalog-pasiragung` / `api-katalog-pasirasung`).

---

## 4. Pilar 3 — Scrum Events

|Event|Adaptasi untuk Solo Developer|Output|
|---|---|---|
|**Sprint Planning**|Di awal tiap sprint, pilih PBI dari Product Backlog untuk masuk Sprint Backlog, perkirakan estimasi waktu pengerjaan per item|Sprint Backlog + estimasi|
|**Daily Scrum**|Diganti dengan **log harian singkat** (3 pertanyaan: apa yang sudah dikerjakan kemarin, apa yang dikerjakan hari ini, ada hambatan apa) — bisa dicatat di README/board (mis. Trello/Notion)|Update progres harian|
|**Sprint Review**|Di akhir sprint, demo hasil increment (bisa direkam/screenshot) dan jika memungkinkan diperlihatkan ke pihak desa untuk masukan awal|Feedback stakeholder, validasi increment|
|**Sprint Retrospective**|Refleksi singkat: apa yang berjalan baik, apa yang perlu diperbaiki di sprint berikutnya (mis. estimasi waktu meleset, kesulitan teknis tertentu)|Action item perbaikan proses untuk sprint berikutnya|

---

## 5. Fase SDLC Keseluruhan (Ringkasan Alur)

```
1. Planning        → PRD (selesai)
2. Analysis/Design  → SRS (selesai)
3. Sprint 0         → Setup project, environment, repo
4. Sprint 1..N      → Scrum cycle: Planning → Daily log → Dev → Review → Retro
5. Testing          → Manual testing tiap PBI (bagian dari DoD) + testing menyeluruh sebelum deploy final
6. Deployment       → FE ke Vercel, BE ke Railway
7. Handover         → Serah terima ke perangkat desa + dokumentasi penggunaan
8. Maintenance      → Perbaikan bug/enhancement pasca handover (di luar scope sprint awal)
```

---

## 6. Tools yang Disarankan

|Kebutuhan|Tools|
|---|---|
|Backlog & board tracking|Trello / Notion / GitHub Projects|
|Version control|Git + GitHub (2 repo: FE & BE)|
|Dokumentasi|Markdown (README per repo)|
|Testing manual|Postman/Thunder Client (test API), browser manual testing (FE)|

---

_Dengan selesainya PRD, SRS, dan SDLC ini, project siap masuk ke tahap Sprint 0 (setup project) dan eksekusi sprint pertama._