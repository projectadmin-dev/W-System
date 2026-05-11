# 📋 Database Design Plan — Commercial Module (Supabase)

**Version:** v1.0 — Commercial Calculator → Supabase Migration  
**Date:** 2026-05-06  
**Status:** Planning (NOT EXECUTED — awaiting approval)

---

## 🎯 Purpose

Migrate `localStorage` / `file-based` data persistence ke **Supabase PostgreSQL** untuk Commercial Module, dengan:
1. **Data integrity** — relational structure dengan foreign keys
2. **Cross-device access** — team bisa akses dari mana saja
3. **Real-time analytics** — query SQL untuk dashboard BI
4. **Integration ready** — hubung ke Finance, Project, After-Sales modules

---

## 📊 Current Data Structure (Frontend JSON)

```json
{
  "projectName": "Consultant Project 01",
  "pic": "Gita",
  "status": "Lost",
  "type": "Consultant",
  "quotationPublish": 53460731,
  "actualDeal": 0,
  "manpower": [
    {
      "group": "FM",
      "role": "Consultant OT",
      "nama": "Dewi",
      "qty": 1,
      "months": 2
    }
  ],
  "deductions": {
    "pajak": 11,
    "founderFee": 3,
    "managementFee": 2,
    "seFee": 0
  },
  "topp": {
    "cogsPct": 25,
    "opexPct": 75
  },
  "summary": {
    "totalHPP": 25584156,
    "totalPublish": 46563164,
    "totalSpecial": 42725540,
    "salesProject": 39113058,
    "profitPublish": 20979008,
    "marginPublish": 45.1,
    "profitActual": -25584156,
    "marginActual": 0,
    "variance": 53460731,
    "variancePct": 100,
    "maxMonths": 2,
    "cogsAmount": 9778264,
    "opexAmount": 29334793,
    "statusMargin": "UNDER BUDGET",
    "opexHPP": 16118018,
    "opexActualVal": 0,
    "deductionDetails": {
      "pajakVal": 5121948,
      "founderVal": 1396895,
      "mgmtVal": 931263,
      "seVal": 0
    }
  },
  "createdAt": "2025-03-15T00:00:00Z"
}
```

---

## 🗄️ Proposed Supabase Schema

### Overview (6 Tables)

```
┌─────────────────────────────┐
│ commercial_projects         │ ← Main table
├─────────────────────────────┤
│ commercial_manpower         │ ← 1:N project rows
├─────────────────────────────┤
│ commercial_rate_cards       │ ← Master data (HPP/Publish/Special)
├─────────────────────────────┤
│ commercial_deductions_log   │ ← Audit trail perubahan deduction
├─────────────────────────────┤
│ commercial_status_history   │ ← Audit trail perubahan status
├─────────────────────────────┤
│ commercial_quotations       │ ← History quotation revisions
└─────────────────────────────┘
```

---

## 📋 Table 1: `commercial_projects`

**Purpose:** Store main project header + calculated summary.

```sql
CREATE TABLE commercial_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project Info
  project_name TEXT NOT NULL,
  project_code TEXT UNIQUE,           -- auto-generated: CMP-2026-0001
  pic TEXT,                           -- Nama PIC (free text)
  pic_user_id UUID,                   -- FK to auth.users (if PIC adalah user sistem)
  
  -- Status & Type (enums)
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Submitted', 'Negotiation', 'Won', 'Lost', 'On Hold')),
  project_type TEXT NOT NULL
    CHECK (project_type IN ('Consultant', 'Networking', 'Project', 'Web', 'WMS')),
  
  -- Deal Numbers
  quotation_publish NUMERIC(15,2) DEFAULT 0,  -- Rencana awal
  actual_deal NUMERIC(15,2) DEFAULT 0,        -- Realisasi
  
  -- Calculated Summary (denormalized for fast query)
  total_hpp NUMERIC(15,2) DEFAULT 0,
  total_publish NUMERIC(15,2) DEFAULT 0,
  total_special NUMERIC(15,2) DEFAULT 0,
  sales_project NUMERIC(15,2) DEFAULT 0,      -- Publish - deductions
  
  -- Profit / Margin
  profit_publish NUMERIC(15,2) DEFAULT 0,
  margin_publish NUMERIC(5,2) DEFAULT 0,      -- percentage
  profit_actual NUMERIC(15,2) DEFAULT 0,
  margin_actual NUMERIC(5,2) DEFAULT 0,         -- percentage
  
  -- Variance
  variance NUMERIC(15,2) DEFAULT 0,
  variance_pct NUMERIC(5,2) DEFAULT 0,          -- percentage
  
  -- TOPP Allocation
  cogs_pct NUMERIC(5,2) DEFAULT 20,
  opex_pct NUMERIC(5,2) DEFAULT 80,
  cogs_amount NUMERIC(15,2) DEFAULT 0,
  opex_amount NUMERIC(15,2) DEFAULT 0,
  
  -- STATUS Margin Kotor
  status_margin TEXT DEFAULT 'IDEAL'
    CHECK (status_margin IN ('IDEAL', 'UNDER BUDGET')),
  opex_hpp NUMERIC(15,2) DEFAULT 0,
  opex_actual_val NUMERIC(15,2) DEFAULT 0,
  
  -- Deductions (stored as JSONB for flexibility)
  deductions JSONB DEFAULT '{"pajak":11,"founderFee":3,"managementFee":0,"seFee":0}'::jsonb,
  
  -- Timeline
  max_months NUMERIC(5,1) DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete (instead of hard delete)
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_commercial_projects_status ON commercial_projects(status);
CREATE INDEX idx_commercial_projects_type ON commercial_projects(project_type);
CREATE INDEX idx_commercial_projects_pic ON commercial_projects(pic);
CREATE INDEX idx_commercial_projects_created_at ON commercial_projects(created_at DESC);
CREATE INDEX idx_commercial_projects_status_margin ON commercial_projects(status_margin);

-- Trigger: auto-update updated_at
CREATE TRIGGER trigger_update_commercial_projects
  BEFORE UPDATE ON commercial_projects
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');
```

---

## 📋 Table 2: `commercial_manpower`

**Purpose:** 1 project = N manpower rows.

```sql
CREATE TABLE commercial_manpower (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES commercial_projects(id) ON DELETE CASCADE,
  
  -- Rate Card Reference
  rate_card_id UUID REFERENCES commercial_rate_cards(id),
  
  -- Manual Entry (if rate card not used)
  group_name TEXT,
  role_name TEXT,
  nama TEXT,                          -- Nama orang (opsional label)
  
  -- Numbers
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  months NUMERIC(5,1) NOT NULL DEFAULT 1 CHECK (months > 0),
  
  -- Calculated from rate card
  rate_hpp NUMERIC(15,2) DEFAULT 0,
  rate_publish NUMERIC(15,2) DEFAULT 0,
  rate_special NUMERIC(15,2) DEFAULT 0,
  
  -- Subtotal (rate * qty * months)
  subtotal_hpp NUMERIC(15,2) DEFAULT 0,
  subtotal_publish NUMERIC(15,2) DEFAULT 0,
  subtotal_special NUMERIC(15,2) DEFAULT 0,
  
  -- Order in UI
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_commercial_manpower_project ON commercial_manpower(project_id);
CREATE INDEX idx_commercial_manpower_rate_card ON commercial_manpower(rate_card_id);
```

---

## 📋 Table 3: `commercial_rate_cards`

**Purpose:** Master data HPP/Publish/Special per role. Bisa di-edit oleh admin.

```sql
CREATE TABLE commercial_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  project_type TEXT NOT NULL
    CHECK (project_type IN ('Consultant', 'Networking', 'Project', 'Web', 'WMS')),
  group_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  
  -- Pricing
  hpp NUMERIC(15,2) NOT NULL DEFAULT 0,          -- Cost
  special_rate NUMERIC(15,2) NOT NULL DEFAULT 0, -- Upper bound
  publish_rate NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Recommended
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: 1 role per group per type
  UNIQUE(project_type, group_name, role_name)
);

-- Indexes
CREATE INDEX idx_rate_cards_type ON commercial_rate_cards(project_type);
CREATE INDEX idx_rate_cards_group ON commercial_rate_cards(group_name);
```

---

## 📋 Table 4: `commercial_status_history`

**Purpose:** Audit trail setiap perubahan status project.

```sql
CREATE TABLE commercial_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES commercial_projects(id) ON DELETE CASCADE,
  
  old_status TEXT,
  new_status TEXT NOT NULL
    CHECK (new_status IN ('Draft', 'Submitted', 'Negotiation', 'Won', 'Lost', 'On Hold')),
  
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT                          -- Optional note: "Client requested delay"
);

CREATE INDEX idx_status_history_project ON commercial_status_history(project_id);
```

---

## 📋 Table 5: `commercial_quotations`

**Purpose:** History revisi quotation (bisa banyak versi per project).

```sql
CREATE TABLE commercial_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES commercial_projects(id) ON DELETE CASCADE,
  
  version INTEGER NOT NULL DEFAULT 1,   -- Quotation v1, v2, v3...
  quotation_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, version)
);

CREATE INDEX idx_quotations_project ON commercial_quotations(project_id);
```

---

## 📋 Table 6: `commercial_deductions_log`

**Purpose:** Audit trail kalau deduction % berubah (e.g. pajak naik dari 11% → 12%).

```sql
CREATE TABLE commercial_deductions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES commercial_projects(id) ON DELETE CASCADE,
  
  field_changed TEXT NOT NULL         -- 'pajak', 'founderFee', 'managementFee', 'seFee'
    CHECK (field_changed IN ('pajak', 'founderFee', 'managementFee', 'seFee')),
  old_value NUMERIC(5,2),
  new_value NUMERIC(5,2) NOT NULL,
  
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deductions_log_project ON commercial_deductions_log(project_id);
```

---

## 🔗 Relasi dengan Modul Lain (W.System)

### 1. 🔵 **Finance Module** (`finance_transactions`, `coa`, `vouchers`)

| Commercial Field | Finance Integration | Flow |
|---|---|---|
| `actual_deal` | Masuk ke **Pendapatan (Revenue)** | Project Won → Generate Invoice → Jurnal Defered Revenue |
| `cogs_amount` | Masuk ke **Beban Pokok Pendapatan** | Project Won + Timeline running → Monthly COGS posting |
| `opex_amount` | Masuk ke **Beban Operasional** | Project Won → Monthly OPEX allocation posting |
| `status = 'Won'` | Trigger: Buat **Customer Invoice** | Finance terima data project → generate AR |

**Relasi Table:**
```sql
-- Di tabel finance_invoices atau finance_revenue_allocation:
ALTER TABLE finance_transactions ADD COLUMN commercial_project_id UUID 
  REFERENCES commercial_projects(id) ON DELETE SET NULL;

-- Atau buat linking table:
CREATE TABLE commercial_finance_links (
  project_id UUID REFERENCES commercial_projects(id),
  invoice_id UUID REFERENCES finance_transactions(id),
  journal_entry_id UUID REFERENCES finance_journal_entries(id),
  linked_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. 🟢 **Project Module** (`projects`, `kanban`, `tickets`)

| Commercial Field | Project Integration | Flow |
|---|---|---|
| `project_name` | Sinkron ke `projects.name` | Commercial Project → PM Project (kalau deal di-Won-kan) |
| `manpower[].nama` | Link ke `projects.assignees` | Dev yang di-calc di Commercial → jadi assignee di Kanban |
| `max_months` | Sinkron ke `projects.timeline` | Timeline Commercial = Timeline Project |
| `status = 'Won'` | Trigger: Buat Project di Kanban | Commercial Won → PM bikin board baru |

**Relasi Table:**
```sql
-- Di tabel projects (existing):
ALTER TABLE projects ADD COLUMN commercial_project_id UUID 
  REFERENCES commercial_projects(id) ON DELETE SET NULL;
  
-- Atau: Commercial bisa refer ke Project:
ALTER TABLE commercial_projects ADD COLUMN project_id UUID 
  REFERENCES projects(id) ON DELETE SET NULL;
```

---

### 3. 🟠 **After-Sales Module** (`clients`, `surveys`, `pengumuman`)

| Commercial Field | After-Sales Integration | Flow |
|---|---|---|
| `pic` | Link ke `clients.pic` atau `users.name` | PIC Commercial bisa jadi PIC Client |
| `status = 'Won'` | Trigger: **Auto-Survey** | Setelah project closed → client isi survey kepuasan |
| `actual_deal` | Masuk ke `clients.lifetime_value` | Total deal klien ini = sum(actual_deal) |

**Relasi Table:**
```sql
-- Di tabel after_sales_clients (existing):
ALTER TABLE after_sales_clients ADD COLUMN commercial_project_id UUID 
  REFERENCES commercial_projects(id) ON DELETE SET NULL;
```

---

### 4. 🔴 **HR Module** (`employees`, `attendance`, `payroll`)

| Commercial Field | HR Integration | Flow |
|---|---|---|
| `manpower[].nama` | Link ke `employees.full_name` | Nama manpower di calc = karyawan di sistem |
| `rate_hpp` | Sinkron ke `employees.base_salary` | HPP karyawan = base salary + benefits |
| `manpower[].months` | Link ke `attendance.period` | Qty months = durasi kerja karyawan |

**Relasi Table:**
```sql
-- Di tabel commercial_manpower:
ALTER TABLE commercial_manpower ADD COLUMN employee_id UUID 
  REFERENCES employees(id) ON DELETE SET NULL;
  
-- Di tabel employees (existing):
ALTER TABLE employees ADD COLUMN commercial_rate_card_id UUID 
  REFERENCES commercial_rate_cards(id) ON DELETE SET NULL;
```

---

## 🛡️ RLS (Row Level Security) Policy

```sql
-- Enable RLS
ALTER TABLE commercial_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_rate_cards ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read all (for now — later by tenant)
CREATE POLICY "Allow read all commercial_projects" 
  ON commercial_projects FOR SELECT 
  TO authenticated USING (true);

-- Policy 2: Users can only create/edit their own (or role-based)
CREATE POLICY "Allow insert commercial_projects" 
  ON commercial_projects FOR INSERT 
  TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow update own commercial_projects" 
  ON commercial_projects FOR UPDATE 
  TO authenticated USING (created_by = auth.uid() OR auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'commercial_manager')
  ));

-- Policy 3: Admin can delete (soft delete only)
CREATE POLICY "Allow soft delete commercial_projects" 
  ON commercial_projects FOR DELETE 
  TO authenticated USING (auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ));
```

---

## 📈 Migration Strategy (localStorage → Supabase)

### Phase 1: Dual Write (1 minggu)
```
Frontend tetap baca/tulis localStorage + Supabase (parallel)
→ Validasi data sama
```

### Phase 2: Read from Supabase (1 minggu)
```
Frontend baca dari Supabase
Tulis masih dual (Supabase + localStorage backup)
```

### Phase 3: Full Supabase (1 minggu)
```
Frontend hanya pakai Supabase
localStorage dihapus / jadi offline cache saja
```

### Phase 4: Integrasi Modul Lain (ongoing)
```
Finance, Project, After-Sales mulai read dari commercial_projects
```

---

## 🧮 Computed Fields Strategy

Fields ini **bisa dihitung real-time** tapi untuk performance di-store sebagai kolom:

| Field | Compute Source | Store? |
|---|---|---|
| `total_hpp` | SUM(manpower.subtotal_hpp) | ✅ Yes (fast query) |
| `sales_project` | total_publish - deductions | ✅ Yes (fast query) |
| `profit_publish` | total_publish - total_hpp | ✅ Yes (fast query) |
| `margin_publish` | (profit / publish) * 100 | ✅ Yes (fast query) |
| `status_margin` | IF(opex_actual < opex_hpp) | ✅ Yes (fast query) |
| `cogs_amount` | sales_project * cogs_pct / 100 | ✅ Yes (fast query) |

**Trigger:** Auto-recalculate saat manpower/deduction/topp berubah.

```sql
CREATE OR REPLACE FUNCTION recalculate_commercial_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate all summary fields
  UPDATE commercial_projects SET
    total_hpp = (SELECT SUM(subtotal_hpp) FROM commercial_manpower WHERE project_id = NEW.project_id),
    total_publish = (SELECT SUM(subtotal_publish) FROM commercial_manpower WHERE project_id = NEW.project_id),
    -- ... etc
    updated_at = NOW()
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_on_manpower_change
  AFTER INSERT OR UPDATE OR DELETE ON commercial_manpower
  FOR EACH ROW EXECUTE FUNCTION recalculate_commercial_project();
```

---

## 📁 Files yang Terdampak (Kalau Execute)

| File | Action |
|---|---|
| `lib/commercial-data.ts` | Add Supabase client queries |
| `app/commercial/page.tsx` | Replace localStorage with Supabase |
| `app/commercial/projects/page.tsx` | Replace file-based API with Supabase |
| `app/api/commercial-projects/route.ts` | Deprecate / redirect ke Supabase |
| `app/commercial/projects/[index]/edit/page.tsx` | Update save logic |
| `public/commercial-calculator.html` | Update untuk dual-write |
| Supabase Migrations | Buat migration files baru |

---

## ⚠️ Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Rate card berubah → old projects ikut berubah | `commercial_manpower` snapshoot rate saat create (jangan FK ke rate card untuk data lama) |
| Soft delete tapi data tetap ada | `is_deleted` + `deleted_at` + RLS filter `WHERE is_deleted = FALSE` |
| Multi-user edit conflict | `updated_at` optimistic locking (reject kalau `updated_at` mismatch) |
| Data migration dari JSON → SQL | Script Python untuk parse JSON dan insert ke Supabase |

---

## ✅ Next Step (Menunggu Approval)

**Pilihan:**
- **A.** Buat Supabase Migration SQL file (`.sql` ke `supabase/migrations/`)
- **B.** Buat Python script untuk migrate existing JSON → Supabase
- **C.** Update frontend untuk dual-write (localStorage + Supabase)
- **D.** Semua sekaligus (migration + migrate data + update frontend)

**Mau execute yang mana?** 🎯
