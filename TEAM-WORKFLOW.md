# 📋 W-SYSTEM TEAM DEVELOPMENT WORKFLOW
## Telegram-First Development dengan Hermes Agent

---

## 📌 OVERVIEW

Team W-System menggunakan **Telegram-only workflow** untuk development. Setiap developer berinteraksi dengan Hermes sub-agent melalui bot Telegram — **TANPA akses langsung ke terminal atau GitHub**.

### Arsitektur
- 🤖 **1 Telegram Bot** untuk semua developer
- 🔑 **1 API Key** (dibayar team lead)
- 🔒 **Session isolation** per developer
- ⚙️ **Hermes agent** handle semua Git operations
- 👨‍💼 **Team lead** handle PR review & merge

---

## ✅ PRASYARAT (Sebelum Mulai)

Sebelum mulai development, pastikan:

- [ ] Sudah join Telegram group **W-System**
- [ ] Sudah simpan nomor **Hermes bot**
- [ ] Team lead sudah add Anda sebagai **contributor** ke GitHub repo
- [ ] Sudah siapkan daftar fitur yang akan dikerjakan
- [ ] Sudah baca workflow ini sampai selesai

---

## 🚀 DEVELOPER WORKFLOW (6 STEPS)

### 1️⃣ START SESSION BARU

**Di Telegram:**
```
/new
```
Atau start chat baru dengan bot.

> 💡 **SESSION TIPS:**
> - Chat yang sama = fitur yang sama
> - Jangan delete chat sampai fitur selesai
> - Kalau mau lanjut besok: *"Lanjut dari kemarin"* di chat yang sama
> - `/new` = reset session untuk fitur baru

---

### 2️⃣ REQUEST FITUR/TASK

Berikan instruksi yang **JELAS** dan **SPESIFIK**.

**✅ GOOD:**
```
Buat halaman dashboard dengan:
- Header dengan user profile dropdown
- Sidebar navigation (Dashboard, Settings, Logout)
- Main content area dengan stats cards
- Gunakan Shadcn components
- Deploy ke port 3001
```

**❌ BAD:**
```
Buat dashboard
```

---

### 3️⃣ AGENT EXECUTION

Agent akan otomatis:
1. Clarify requirements (jika perlu)
2. Create/update files
3. Install dependencies (jika perlu)
4. Build & test
5. Deploy via PM2

**Deploy commands (via agent):**
```
"Deploy ke port 3001"     — untuk app utama
"Restart PM2"             — jika ada issue
"Check logs"              — untuk debugging
```

---

### 4️⃣ TESTING

1. Buka **URL** yang diberikan agent
2. Test manual di **browser**
3. Report bugs ke agent di **chat yang sama**

> ⚠️ **JANGAN** mix features — 1 session = 1 fitur

---

### 5️⃣ GIT COMMIT & PUSH

**PENTING:** Selalu gunakan **FEATURE BRANCH!**

**Setelah fitur selesai & tested:**
```
Siap untuk commit. Buat branch feature/dashboard-page
```

**Atau jika belum siap:**
```
Save dulu, belum siap commit
```

**Agent akan:**
1. Create branch baru
2. Commit semua changes
3. Push ke GitHub
4. Berikan link PR

**Jika sudah ada branch sebelumnya:**
```
Checkout branch feature/dashboard-page, lanjutkan development
```

**Jika mau mulai fitur baru:**
```
Buat branch feature/new-feature-name
```

> 🚨 **JANGAN commit ke master langsung!**

---

### 6️⃣ PR REVIEW

**Team lead akan:**
1. Review PR di GitHub
2. Request changes (jika perlu)
3. Merge ke master
4. Notify developer setelah merge

> ✅ **Step 7 (Developer):** Tunggu konfirmasi dari team lead setelah PR merge

---

## ⚠️ GIT CONFLICTS

Jika ada conflict saat merge:

1. Agent akan notify di Telegram
2. Team lead akan resolve di GitHub
3. Developer lanjut kerja setelah merge selesai

---

## 📁 PROJECT STRUCTURE

```
/home/ubuntu/apps/wsystem-1/
├── apps/web/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── middleware.ts
├── supabase-schema.sql
└── package.json
```

### Naming Convention

| Item | Format | Example |
|------|--------|---------|
| Multi-app | `wsystem-N` | wsystem-1, wsystem-2, wsystem-3 (milestone-based) |
| Branches | `feature/<name>` | feature/dashboard-page, feature/auth-login |
| Ports | `300N` | 3001, 3002, 3003 (per app) |

---

## 🎯 BEST PRACTICES

### ✅ DO
- Session baru untuk fitur baru
- Feature branch selalu
- Test sebelum commit
- Commit message descriptive
- Report bugs segera
- Gunakan chat yang sama sampai fitur selesai

### ❌ DON'T
- Jangan mix features (1 session = 1 fitur)
- Jangan skip testing
- Jangan commit ke master
- Jangan ganti chat sampai fitur selesai
- Jangan edit `.env.local` manual

---

## 📊 WORKFLOW DIAGRAM

```
Developer
    ↓
Telegram Bot (Send Request)
    ↓
Hermes Agent (Execute Task)
    ↓
Build & Deploy (PM2 + VPS)
    ↓
Test in Browser
    ↓
Commit & Push (Feature Branch)
    ↓
Team Lead (PR Review)
    ↓
Merge to Master
```

---

## 🔐 SECURITY NOTES

| Credential | Policy |
|------------|--------|
| Supabase URL | ✅ OK untuk share di tim |
| Service Role Key | 🚨 ONLY server-side, NEVER di client |
| API Keys | 📝 Stored di `.env.local`, never commit |
| Database credentials | 🔒 NEVER share di chat |
| GitHub token | 👨‍💼 Managed by team lead |
| `.env.local` | 🤖 Auto-generated oleh agent, jangan edit manual |

---

## 🎓 QUICK START (DEV BARU)

1. Join Telegram group **W-System**
2. Start chat dengan **Hermes bot**
3. Ketik `/new` untuk session pertama
4. Request task pertama
5. Test & commit
6. PR untuk review
7. **Tunggu konfirmasi** dari team lead setelah PR merge

---

## 🛠️ TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Agent tidak respond | Cek koneksi Telegram, ketik `/new` lagi |
| Deploy gagal | Ketik *"Check logs"* untuk debug |
| Git conflict | Tunggu team lead resolve di GitHub |
| Port sudah dipakai | Minta agent deploy ke port lain (3002, 3003) |
| Session hilang | Chat yang sama = session sama, jangan delete |

---

## 📞 SUPPORT

Untuk pertanyaan atau issue:
- Hubungi **team lead** di Telegram
- Atau tanya langsung di group **W-System**

---

**Last Updated:** April 17, 2026
**Version:** 1.0
**Author:** W-System Team
