# Bumi Ventila — fe-crm

Alat komersial **internal** (SPA React) untuk tiga lini layanan Bumi Ventila —
**laboratorium** (ISO/IEC 17025), **training**, dan **konsultansi**: registry
kepatuhan (Site → Sampling Point → Obligation) yang menggerakkan permintaan lewat
kalender jatuh tempo regulasi, plus pipeline deal per lini, quote & sales order,
feasibility gate, dan lead scoring.

## Lini layanan & pipeline
Tiap lini punya pipeline sendiri agar win rate dan forecast tidak tercampur.
Lini diturunkan dari `type` pipeline (tidak disimpan terpisah di Deal):

| Lini | Pipeline bawaan | Tipe |
|---|---|---|
| Laboratorium | Akuisisi Pengujian Lab (ISO 17025) | `COMPLIANCE_ACQUISITION` |
| Laboratorium | Rebooking Kepatuhan (Recurring) | `COMPLIANCE_RECURRING` |
| Training | Akuisisi Training | `TRAINING` |
| Training | Refresher & Re-sertifikasi | `TRAINING_RECURRING` |
| Konsultansi | Akuisisi Konsultansi | `CONSULTING` |

Kelola & tambah pipeline di `/crm/pipelines` (buat dari template siap pakai).
Gate kelayakan memakai model yang sama (`CrmFeasibilityReview`) di semua lini,
hanya istilah checklist-nya menyesuaikan: lab memakai ruang lingkup akreditasi &
subkontrak, training memakai kompetensi & ketersediaan trainer, konsultansi
memakai kualifikasi tim & tenaga ahli eksternal.

**Khusus peran internal** — pengguna `Customer` ditolak (guard rute + backend 403).

## Stack
React 18 · Vite 5 · Tailwind 3 · React Router 6 · Framer Motion · Lucide · JavaScript.

## Layar
CRM Dashboard · Leads + Lead Detail · Accounts + Account Detail + Duplicates/Merge ·
Contacts · Deals (list + board) + Deal Detail · Pipeline · Price Books · Quote Builder ·
Sampling Points (+ Sites & Import Titik sebagai modal) · Compliance Calendar ·
Activities · Meeting Notes · Scoring Settings.

## Setup
1. `cp .env.example .env` lalu set `VITE_API_URL` (URL backend, mis. `http://localhost:3000`).
2. `npm install`
3. `npm run dev` → http://localhost:5174
4. Build produksi: `npm run build` (output di `dist/`), pratinjau `npm run preview`.

## Auth (SSO)
Token disimpan pada key bersama `bv-auth-token` (sama dengan `fe-order-management`).
Guard `InternalOnly` menolak `Customer` (→ halaman `/forbidden`); otorisasi
sebenarnya di backend (`requireRole` menolak `Customer` dengan 403).

## Catatan
- Klien API (`src/lib/api.js`) memuat `authApi`, `crmApi`, `usersApi.me`, dan
  `orderApi` (baca-saja, untuk menautkan Deal → Order lintas domain).
- Master data (Service/Package/Matrix) hanya **dibaca** via `GET /api/crm/catalog`
  & `/price-books`; editornya ada di `fe-order-management`.
- Tautan Deal → Order (`orderCode`) menghubungkan ke portal Order Management.
- Tidak ada dependensi kode ke `fe-order-management` (design tokens & util diduplikasi).
