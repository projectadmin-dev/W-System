# Backup Pre-Supabase — Commercial Module

## ⚠️ Snapshot Date
2026-05-11 — Sebelum migration ke Supabase

## 📦 Isi Backup

| File | Deskripsi |
|------|-----------|
| `pages/commercial-calculator.tsx` | Calculator page (pakai hardcoded RATE_CARD array) |
| `pages/rate-cards.tsx` | Master Data Rate Card page (baca/tulis ke JSON file) |
| `pages/projects.tsx` | Projects Listing page (baca dari JSON file) |
| `api/route.ts` | API route commercial-rate-cards (GET/POST/PUT/DELETE ke JSON) |
| `data/commercial-rate-cards.json` | 40 rate cards (master data) |
| `data/commercial-projects.json` | 12 saved projects dengan summary |
| `lib/commercial-data.ts` | Helper functions: fmtIDR, parseIDR, calcRow, calculateSummary |

## 🔄 Cara Restore

Kalau CRUD Supabase bermasalah, copy file dari folder ini ke lokasi aslinya:

```bash
# Restore pages
cp pages/commercial-calculator.tsx /home/ubuntu/apps/wsystem-1/apps/web/app/commercial/page.tsx
cp pages/rate-cards.tsx /home/ubuntu/apps/wsystem-1/apps/web/app/commercial/rate-cards/page.tsx
cp pages/projects.tsx /home/ubuntu/apps/wsystem-1/apps/web/app/commercial/projects/page.tsx

# Restore API
cp api/route.ts /home/ubuntu/apps/wsystem-1/apps/web/app/api/commercial-rate-cards/route.ts

# Restore data
cp data/commercial-rate-cards.json /home/ubuntu/apps/wsystem-1/apps/web/data/
cp data/commercial-projects.json /home/ubuntu/apps/wsystem-1/apps/web/data/

# Restore lib
cp lib/commercial-data.ts /home/ubuntu/apps/wsystem-1/apps/web/lib/commercial-data.ts
```

## 🔗 Relasi dengan Module Lain (Saat Ini)

| Fitur | Status | Keterangan |
|-------|--------|------------|
| HR Master Data | ❌ Belum terhubung | PIC masih text, nanti link ke employees table |
| Quotations | ❌ Belum terhubung | quotation_id nullable, akan di-link manual |
| Projects | ❌ Belum terhubung | project_id nullable, akan di-link manual |
| Finance Invoice | ❌ Belum terhubung | invoice_id nullable, akan di-link manual |
| Tenant Isolation | ✅ Aktif | Semua data sudah scoped per tenant di JSON |

## 📋 Schema Supabase yang Akan Dibuat

3 table baru:
1. `commercial_rate_cards` — master data rate card
2. `commercial_projects` — saved project dari calculator
3. `commercial_project_manpower` — manpower rows per project + snapshot rates

+ 1 database view: `v_commercial_project_summary` — summary calculated on-the-fly

## 🛡️ Keamanan Data

Backup ini TIDAK mengandung credential, token, atau data sensitif user.
Semua data bersifat dummy/sample untuk development.
