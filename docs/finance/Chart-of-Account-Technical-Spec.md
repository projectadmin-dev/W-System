# Chart of Account — Technical Specification

**Module:** Finance & Accounting → Master Data → Chart of Account
**Route:** `/finance/coa` (workspace) · `/finance/coa/[id]` (General Ledger drill-down)
**Status:** R1 — UI/UX Revamp Specification · **Phases 0–5 implemented + QA logged** (`/finance/qa`)
**Author:** Engineering (generated from codebase + design handoff analysis)
**Last updated:** 2026-05-31
**Audience:** Frontend, Backend, Design, Finance Controller

> **Stakeholder decisions (2026-05-31):** page title = **"Chart of Account - Workspace"**;
> codes **migrate to true segments** (OQ-1); Sub GL master-data integration **deferred**
> while source data is still nil (OQ-3); **full scope committed** — Phases 0–5 (OQ-6).
> Phases 0–1 are implemented (`apps/web/components/finance/coa/**`); Phases 2–5 pending.

> This document benchmarks the **current** Chart of Account (CoA) workspace against the
> **IFAS / UBS Gold** design handoff (`Chart of Account (standalone).html` + `coa-standalone/*.jsx`
> + `IFAS COA Structure Knowledge R0.md`) and specifies the work required to revamp the
> CoA workspace UI/UX while preserving the W-System stack (Next.js 16 + shadcn/ui + Tailwind + Supabase).

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope)
2. [Current State ("As-Is")](#2-current-state-as-is)
3. [Target Design ("To-Be")](#3-target-design-to-be)
4. [Gap Analysis](#4-gap-analysis)
5. [Domain Model & Business Rules](#5-domain-model--business-rules)
6. [Information Architecture & Layout](#6-information-architecture--layout)
7. [Component Inventory](#7-component-inventory)
8. [Visual Design System (IFAS → shadcn/Tailwind)](#8-visual-design-system-ifas--shadcntailwind)
9. [Data Model & Schema Changes](#9-data-model--schema-changes)
10. [API Contract](#10-api-contract)
11. [Interaction Flows](#11-interaction-flows)
12. [Phased Implementation Plan](#12-phased-implementation-plan)
13. [Accessibility, i18n & Performance](#13-accessibility-i18n--performance)
14. [Risks & Open Questions](#14-risks--open-questions)
15. [Appendix A — COA Full Code Anatomy](#appendix-a--coa-full-code-anatomy)
16. [Appendix B — Layer & Token Reference](#appendix-b--layer--token-reference)

---

## 1. Goal & Scope

### 1.1 Goal

Revamp the Chart of Account **workspace** from a flat, single-table CRUD screen into a
**hierarchical 5-layer COA Explorer** with a 3-pane layout (layer filter · tree-table · inspector),
matching the IFAS / UBS Gold design handoff, while keeping the implementation native to the
W-System stack.

### 1.2 In scope

- Full UI/UX revamp of `/finance/coa` into a tree-based explorer.
- 5-layer hierarchy: **Category → Account Type → Sub Account → General Ledger → Detail Ledger**.
- Inspector panel with per-layer properties, sub-account management, and Sub GL configuration.
- Supporting subsystems surfaced in the workspace: **Pending Approvals**, **Audit Trail**,
  **Import/Export**, **Density toggle**, **Searchable parent selection**.
- Data-model and API changes required to back the above UI.

### 1.3 Out of scope (this revamp)

- The sibling **Laporan Keuangan** screen (shipped in the same handoff bundle) — tracked separately.
- Journal posting engine changes (the CoA only *feeds* posting; the `/finance/coa/[id]` General
  Ledger drill-down stays functionally as-is, restyled to the new tokens).
- Master Data CRUD for Karyawan/Supplier/Customer/Valuta/Bank/Fixed Asset (CoA *consumes* these as
  Sub GL sources; their own screens are separate modules).

### 1.4 Design source of truth

| Artifact | Location (handoff bundle) | Use |
|---|---|---|
| Domain knowledge | `uploads/IFAS COA Structure Knowledge R0.md` | Authoritative business rules |
| Data layer & tokens | `coa-standalone/data.jsx` | Mock model, design tokens, helpers |
| App shell + inspector | `coa-standalone/app.jsx` | 3-pane layout, inspector, CRUD handlers |
| Tree/section components | `coa-standalone/sections.jsx` | TreeRow, Sub-* sections, Sub GL drawer |
| Primitives | `coa-standalone/atoms.jsx` | SearchableSelect, Modal, Toast, chips, toggles |
| Modals | `coa-standalone/modals.jsx` | Create/Edit/Delete/SubDL/SubGL/Approvals/Import/Audit |
| Brand tokens | `ifas/colors_and_type.css` | Poppins, palette, spacing, radii, shadows |

> The prototype is **HTML/CSS/JS with inline styles and `window` globals** (React 18 standalone,
> Material Icons, Bootstrap-derived IFAS theme). It is a **visual + behavioral reference**, not code
> to port verbatim. Recreate the *visual output and interactions* on the W-System stack.

---

## 2. Current State ("As-Is")

### 2.1 Workspace — `apps/web/app/finance/coa/page.tsx`

A single client component (`COAPage`, ~596 lines) rendering:

- **Header**: title + "Tambah Akun" button.
- **Cash-Flow summary cards** (5): operating / investing / financing / non_cash / not_applicable —
  clickable as filters.
- **Filters**: account-type buttons (`all/asset/liability/equity/revenue/expense`) + a Cash Flow
  category `Select`.
- **Flat table**: columns `Code · Account Name · Type · Cash Flow · Description · Status · Actions`.
  No hierarchy, no expand/collapse, no indentation.
- **Type summary cards** (5) at the bottom.
- **Modals**: Add, Edit, Delete-confirm. Parent is entered as a **raw UUID text field**
  (`parent_id` / "UUID of parent account").
- Data fetched from `/api/finance/coa` filtered client-side; toasts via `sonner`; mixed
  Indonesian/English copy.

### 2.2 Drill-down — `apps/web/app/finance/coa/[id]/page.tsx`

`GeneralLedgerPage` (~196 lines): per-account General Ledger view — date range filter, journal-line
table with running balance, totals footer, links to journal entries. **Keep functionally**, restyle
to new tokens.

### 2.3 Repository — `apps/web/lib/repositories/finance-coa.ts`

`getCoaAccounts`, `getCoaById`, `getCoaByCode`, `getCoaByType`, `getCoaTree` (builds a hierarchy but
the FE never uses it), `createCoaAccount`, `updateCoaAccount`, `deleteCoaAccount` (soft-delete, blocks
if referenced by `journal_lines`). Uses the **admin client** (RLS bypassed; auth enforced at the API
layer).

### 2.4 API — `apps/web/app/api/finance/coa/route.ts`

`GET` (by `id` / `code` / `type` / `tree` / `cashFlowCategory` / list) · `POST` (validates
`account_code, account_name, account_type, level`; rejects duplicate code) · `PUT?id=` · `DELETE?id=`.
Tenant resolved server-side; envelope is a **bare array / object** (no `{ data, meta }`).

### 2.5 Database — `public.coa`

Base columns (`apps/web/src/types/database.ts`): `id, tenant_id, account_code, account_name,
account_type, level, normal_balance, parent_account_id, description, tax_code, is_active,
created_at/by, updated_at, deleted_at`.

**Already extended (migrations not yet reflected in `database.ts` types):**

- `20260425080654_add_cash_flow_category_to_coa.sql` → `cash_flow_category`.
- `20260528000001_coa_layer_flags.sql` → `coa_layer` (`category|type|sub_account|general_ledger|detail_ledger`),
  `sort_order`, `enum_laporan_keuangan`, `enum_laporan_keuangan_category`, `contra_account`,
  `direct_indirect_cost`, `enum_cost_category`, `enum_cf_section`, `enum_cf_line`,
  `is_working_capital`, `is_non_cash_item`, `is_budgeted`, `is_tax_deductible`, `is_restricted`,
  `is_trial_balance`, `is_taxation_report`.
- Seed `20260528000007_seed_wit_coa.sql` populates **L1–L4 only** (8 categories down to General
  Ledger). **No Detail Ledgers, no Sub GL, no Sub-DL** are seeded.

> **Key takeaway:** the DB already carries most of the 5-layer *attribute* surface. What is missing is
> the **Detail-Ledger sub-tree, Sub GL configuration/values, Pending-Approval and Audit-Log tables**,
> plus regenerated TypeScript types.

### 2.6 App shell

`apps/web/app/finance/layout.tsx` → shadcn `SidebarProvider` + `AppSidebar` + `SidebarInset` +
breadcrumb header (light mode). CoA is registered in `app-sidebar.tsx` under
**Finance & Accounting → "Chart of Accounts" → `/finance/coa`**. The revamped page must live **inside
this existing inset shell** (do not reproduce the prototype's own dark IFAS sidebar).

### 2.7 Limitations driving the revamp

1. **Flat list** — no hierarchy despite `level`/`parent_account_id`/`coa_layer` existing.
2. **Raw-UUID parent input** — unusable for real data entry.
3. No search, no expand/collapse, no layer filtering, no density control.
4. Conflates `account_type` (asset/liability/…) with **layer**; no Detail Ledger / Sub GL concept.
5. No inspector, no sub-account management, no audit visibility, no import/export.
6. Inconsistent ID/EN copy; styling diverges from the IFAS brand.

---

## 3. Target Design ("To-Be")

A **COA Explorer** workspace. Reference: `coa-standalone/app.jsx` (`CoaApp`).

### 3.1 Page anatomy

```
┌─ Finance inset shell (existing AppSidebar + breadcrumb) ───────────────────────────┐
│ ┌─ Page header card ───────────────────────────────────────────────────────────┐  │
│ │ Breadcrumb · "Chart of Account - Workspace" · subtitle                         │  │
│ │ [Density] [Expand|Collapse] [Import] [Export] [Inspector] [+ Akun Baru]        │  │
│ └───────────────────────────────────────────────────────────────────────────────┘  │
│ ┌─ Filter & Quick Actions ─┐ ┌─ Tree-table (main) ─────────────────────────────┐   │
│ │ COA Layers (counts)      │ │ search · filter · "N rows"                       │   │
│ │  • Semua akun            │ │ ┌ Code & Name │ Layer │ COA Full │ D/K │ SubGL │…│   │
│ │  • Account Category      │ │ │ ▸ 1  AKTIVA          [CATEGORY] 1   DEBIT  …   │   │
│ │  • Account Type          │ │ │   ▸ 1-1 AKTIVA LANCAR…                        │   │
│ │  • Sub Account Type      │ │ │       … indented tree rows …                  │   │
│ │  • General Ledger        │ │ └───────────────────────────────────────────────┘   │
│ │  • Detail Ledger         │ └─────────────────────────────────────────────────┘   │
│ │ Quick Actions            │   ┌─ Inspector (slide-in drawer, overlays) ───────┐   │
│ │  • Pending approvals (N) │   │ Layer badge · name · COA full code            │   │
│ │  • Import/Export history │   │ Hierarchy path · Properties · Sub Akun ·      │   │
│ │  • Audit trail (N)       │   │ Sub GL Config (deepest DL) · Audit · actions  │   │
│ │ [ISO 27001 · SOX 404]    │   └───────────────────────────────────────────────┘   │
│ └──────────────────────────┘                                                         │
│ Footer hints: ↑↓ navigate · → expand · ← collapse · ⏎ select · ⌘F search             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Headline capabilities

| # | Capability | Reference |
|---|---|---|
| 1 | **5-layer tree-table** with indentation, expand/collapse, per-layer colored code chips | `sections.jsx › TreeRow`, `data.jsx › buildHierarchy/flatten` |
| 2 | **Layer filter panel** with live counts (Semua/Category/Type/Sub/GL/Detail) | `app.jsx › layers` |
| 3 | **Global search** across code / name / COA full code, auto-expanding matches | `app.jsx › queryFiltered` |
| 4 | **Inspector drawer** — properties, hierarchy path, sub-account & Sub GL management, audit mini | `app.jsx` inspector block |
| 5 | **Sub Account / GL children** (Sub Akun) with batch key-in, 1-level depth, code conventions | `sections.jsx › SubChildrenSection` |
| 6 | **Sub-Detail-Ledger (Sub-DL)** up to 2 levels, key-in or master-data source | `sections.jsx › SubDlChildrenSection` |
| 7 | **Sub GL Configuration** (multi-level attributes, master-data vs key-in) on deepest DL only | `sections.jsx › SubGlConfigSection`, `SubGlValueDrawer` |
| 8 | **Pending Approvals** — master-data-driven DL auto-generation with review/approve/reject | `modals.jsx › PendingApprovalsModal/PreviewItemModal` |
| 9 | **Audit Trail** (ISO 27001 / SOX 404) — immutable log with before/after diff, filters | `modals.jsx › AuditTrailModal` |
| 10 | **Import / Export** + history (CSV/Excel, partial-failure reporting) | `modals.jsx › ImportModal/ImportHistoryModal` |
| 11 | **Density toggle** (comfortable/compact) and **searchable parent selection** everywhere | `atoms.jsx › DensityToggle/SearchableSelect` |

---

## 4. Gap Analysis

| Dimension | Current | Target | Effort |
|---|---|---|---|
| Layout | Single flat table + summary cards | 3-pane explorer (filter · tree · inspector) | **L** |
| Hierarchy | None (flat) | 5-layer tree w/ expand-collapse + indentation | **L** |
| Parent selection | Raw UUID text input | `SearchableSelect` + live `HierarchyPath` preview | **M** |
| Account concept | `account_type` only | `coa_layer` + `account_type` + reporting enums | **M** |
| Detail Ledger | Absent | DL + Sub-DL (≤2 levels), posting-leaf rules | **L** |
| Sub GL | Absent | Multi-level config + lazy value catalog | **XL** |
| Approvals | Absent | Pending-approval workflow → DL generation | **L** |
| Audit | Absent in UI | Immutable audit log + diff viewer | **L** |
| Import/Export | Absent | CSV/Excel + partial-failure history | **M** |
| Density/search | Absent | Toggle + global + section search | **S** |
| Visual system | shadcn defaults | IFAS brand mapped onto shadcn tokens | **M** |
| Backend tables | `coa` only | `coa` (+cols) · `coa_sub_gl_config` · `coa_sub_gl_value` · `coa_pending_approval` · `coa_audit_log` | **L** |
| API envelope | bare array/object | keep bare for FE simplicity (document either way) | **S** |
| Types | `database.ts` stale | regenerate after migrations | **S** |

Effort key: S ≤ 1d · M ≈ 2–3d · L ≈ 1wk · XL > 1wk (single-dev estimates, UI+API).

---

## 5. Domain Model & Business Rules

Authoritative source: `IFAS COA Structure Knowledge R0.md`. Summary for implementers:

### 5.1 The 5 layers

| Lv | Layer | `coa_layer` (DB) | Prototype key | Segment code width | Children allowed |
|---|---|---|---|---|---|
| 1 | Account Category | `category` | `category` | 1 digit | Account Type |
| 2 | Account Type | `type` | `type` | 1 digit | Sub Account |
| 3 | Sub Account Type | `sub_account` | `sub` | 2 digits (`00`–`99`) | GL **+ 1 self-level** |
| 4 | General Ledger | `general_ledger` | `gl` | 1–2 digits (`0`–`9`) | Detail Ledger **+ 1 self-level** |
| 5 | Detail Ledger | `detail_ledger` | `detail` | 4 digits (`0000`–`9999`) | **Sub-DL ≤ 2 levels** |

**COA Full Code** = segment codes joined by `-`, e.g. `1-1-01-1-2000` (see Appendix A).

### 5.2 Cascading & flags

1. **Normal Balance is input only at Category** (`debit`/`credit`) and **cascades** to all
   descendants. No NB input on layers 2–5.
2. **Contra Account** (Type layer, `contra_account`): flips effective NB of the whole subtree
   (e.g., *Akumulasi Penyusutan* under Aktiva → effectively credit). Backend owns the flip; FE
   only reads/sets the flag. (PSAK 16.)
3. **Restriction** (`is_restricted`): on Sub Account and GL; GL may **override** its parent.
   Restricts the account from certain reporting queries.
4. **Detail Ledger flags**: `required_sub_gl`, `is_washed_out_account` (auto-zeroed at period
   end), `required_child` (must have a Sub-DL before it can post).
5. **Self-referencing children ("Sub Akun")**:
   - Sub Account: max **1** self-level, codes `00`=header / `01–99`=children (≤ 99).
   - GL: max **1** self-level, codes `0`=header / `1–9`=children (≤ 9).
   - Detail Ledger: **Sub-DL up to 2 levels** (`MAX_SUB_DL_LEVEL = 2`).
6. **Posting & Sub GL only on the deepest DL** (leaf). When a DL gains its first Sub-DL child, its
   own Sub GL config is **auto-removed**.

### 5.3 Sub GL (Sub General Ledger)

An extra tracking dimension on the **deepest** Detail Ledger — splits one account's balance by entity
(per employee/supplier/asset/etc.).

- **Config** = ordered list of *attribute levels*; each level pulls from **Master Data**
  (`MASTER_DATA_M_KARYAWAN`, `…_SUPPLIER`, `…_CUSTOMER`, `…_VALUTA`, `…_BANK`,
  `…_KELOMPOK_FIXED_ASSET`, `…_SUB_KELOMPOK_FIXED_ASSET`, `…_PEMILIK`) or is **Key-In** (static).
- **Composite** (multi-level) → kode `01-001`, nama `KENDARAAN › KENDARAAN LISTRIK`.
- **Values are lazy** (`get-or-create` at first journal posting); never embedded in the DL dropdown
  (≈30× lighter). Surfaced read-only via the **Sub GL Value drawer** (paged, searchable, sortable).

### 5.4 Pending Approval

New master data (currency/supplier/customer/…) does **not** auto-create Detail Ledgers. It lands in
**Pending Approvals**; the Finance Controller previews the DLs that *would* be generated, then
Approve (BE auto-generates) or Reject. Carries `riskLevel` + `riskNote`, `estimatedDls[]`,
`masterDataPayload`, requester/timestamp. Supports bulk select + approval note (logged to audit).

### 5.5 Audit Trail (ISO 27001 / SOX 404)

Every CoA mutation is logged immutably (7-year retention). Actions & severity:
`CREATE`(low) · `EDIT`(medium) · `DELETE`(high) · `CONFIG`(high) · `STATUS`(high) ·
`APPROVAL`(medium) · `IMPORT`(medium). Each entry stores actor, timestamp, target (guid/code/name/
layer), changed `field`, and `beforeData`/`afterData` for a field-level diff. Import/Export history is
tracked **separately** from the audit trail.

### 5.6 User-facing terminology (ID)

| Technical | User-facing |
|---|---|
| Sub-Detail Ledger / children | **Sub Akun** |
| Attribute Level | **Level Sub GL** |
| Get-or-Create | *(hidden — backend concern)* |
| New Account | **Akun Baru** |

---

## 6. Information Architecture & Layout

### 6.1 Grid

- **Outer**: lives inside `SidebarInset`. Page = vertical stack: header card → workspace → footer hints.
- **Workspace**: CSS grid `268px 1fr` when the layer panel is open, `1fr` when collapsed
  (animated `grid-template-columns`, 200ms). Height ≈ `calc(100vh - 180px)`, `min-height: 600px`.
- **Inspector**: **overlay drawer** (not a 3rd grid column) — `position:absolute; inset:0`, right-aligned
  440px panel, scrim `rgba(19,42,63,0.4)` + blur, slides in from the right. Toggled by the header
  **Inspector** button and by selecting a row.

### 6.2 Tree-table columns

`gridTemplateColumns: minmax(300px,2.4fr) 110px 150px 80px 90px 100px 90px`

| Col | Content |
|---|---|
| Code & Name | expand chevron (if children) · indent (`depth × indentStep`) · **layer-colored mono code chip** · name (ellipsis) |
| Layer | `LayerBadge` (pill, layer color) |
| COA Full Code | mono, muted |
| D/K | `DKChip` (DEBIT=info / CREDIT=warning) |
| Sub GL | violet "Sub GL" chip when `has_sub_gl`, else `—` |
| Status | `StatusDot` (active/inactive) |
| Actions | edit · delete (revealed on hover/selection) |

Selected row: `primaryBg` background + 3px left `primary` border. Empty state: dataset icon +
"Tidak ada hasil for '<query>'".

### 6.3 Inspector contents (top → bottom)

1. **Layer badge** + name + `nameEn` + COA full code.
2. **Hierarchy Path** — ancestry chain (code chip + name per ancestor).
3. **Properties** — Code, Level, Normal balance (`DKChip`); for DL: Sub-DL level, posting-allowed
   state; for non-DL: Sub GL state; Type: Contra; Sub/GL: Restriction; Status; DL: Washed-out.
4. **Sub Akun section** — context-aware:
   - `sub` → `SubChildrenSection` (max 99, 2-digit hint).
   - `gl` → `SubChildrenSection` (max 9, 1-digit hint).
   - `detail` → `SubDlChildrenSection` (≤2 levels).
5. **Sub GL Config** — only when selected is the **deepest DL** (`SubGlConfigSection` + value drawer).
6. **Audit Trail mini** — created/updated by/at.
7. **Actions** — Edit · Hapus.

---

## 7. Component Inventory

Build these as **shadcn/Tailwind** components under `apps/web/components/finance/coa/`. Map each
prototype primitive to its shadcn equivalent; do **not** copy inline styles.

### 7.1 Primitives (from `atoms.jsx`)

| Component | Spec | shadcn/Tailwind basis |
|---|---|---|
| `LayerBadge` | Pill, label per layer, layer color + tint bg | `Badge` variant + token classes |
| `CodeChip` | Mono, layer-colored, rounded-full | `<span>` w/ tokens |
| `DKChip` | DEBIT (info) / CREDIT (warning) | `Badge` |
| `StatusDot` | Dot + Active/Inactive | `<span>` |
| `SubGlChip` | Violet "Sub GL" | `Badge` |
| `DensityToggle` | comfortable/compact segmented control | `ToggleGroup` |
| `SearchableSelect` | **Required** for all option pickers; search + code + checkmark | `Command` + `Popover` (combobox) |
| `HierarchyPath` | Ancestry chain w/ optional pending `[NEW]` node | composed |
| `Toggle` | switch | `Switch` |
| `Toast` | success/danger/warning | `sonner` (already used) |
| `Field` | label + control + hint/error | `Label` + control |
| `PropRow` | label ↔ value row | composed |
| `Modal` | header/body/footer, scrim+blur | `Dialog` |

### 7.2 Sections (from `sections.jsx`)

| Component | Responsibility | Notes |
|---|---|---|
| `TreeRow` | one visible tree node; memoized; emits toggle/select/action | density-aware paddings |
| `SubChildrenSection` | Sub-Account / GL children list; search (>5), paging (8/pg), max-guard, usage badge, REST badge | reused for `sub` & `gl` via props |
| `SubDlChildrenSection` | Sub-DL list; depth guard (`canAcceptSubDl`), Lv badge, "Sub GL" badge on deepest | |
| `SubGlConfigSection` | Required toggle, ordered attribute-level cards (master-data/key-in), add/edit/delete level, "Lihat N Sub GL Value" | violet themed; deepest DL only |
| `SubGlValueDrawer` | Right drawer; paged/searchable/sortable read-only value catalog | values are mocked in proto; **lazy API** in prod |

### 7.3 Modals (from `modals.jsx`)

| Modal (`modal.kind`) | Purpose | Key behaviors |
|---|---|---|
| `create` | New account (any layer) | Layer selector switches the form: NB only for `category`; parent via `SearchableSelect`; per-layer attribute cards; live `HierarchyPath` |
| `edit` | Edit selected node | Per-layer attribute editing; logs `EDIT` |
| `createSubChild` | Batch Sub-Account/GL children | Multi-row key-in; code-width + duplicate + max-count validation |
| `createSubDl` | Sub-DL under a DL | Key-in (batch, 4-digit) **or** Master-Data (+generated preview); parent loses Sub GL config |
| `subGlLevel` | Add/edit a Sub GL attribute level | Master-Data (source+column) or Key-In rows; `CompositePreview` |
| `delete` | Delete confirm | Blocks if children exist; **type-to-confirm**; logs `DELETE` (high) |
| `pendingApprovals` | Review queue | Bulk select, approve N (→ X DLs) / reject N, approval note |
| *(preview item)* | DL-generation preview for one approval | risk level/note, estimated DLs, master payload |
| `importHistory` | Past import/export runs | status complete/partial/failed + reasons |
| `auditTrail` | Immutable log | filters (action/severity/search), before/after diff |
| `import` | Upload CSV/Excel | parse → preview → commit; partial-failure reporting |

---

## 8. Visual Design System (IFAS → shadcn/Tailwind)

> **Per `CLAUDE.md`:** the web app extends `packages/ui/src/styles/globals.css`; do **not** add a
> separate `tailwind.config` in `apps/web`. Introduce IFAS as **CSS variables + Tailwind token
> aliases** in the shared globals (or a scoped `.coa-workspace` theme), then consume via utility
> classes — keep the radix-nova component contracts intact.

### 8.1 Core tokens (from `ifas/colors_and_type.css` + `data.jsx › IFAS`)

| Token | Value | Use |
|---|---|---|
| Font sans | **Poppins** (self-hosted TTF, weights 100–900) | UI text |
| Font mono | `ui-monospace, 'SF Mono', 'Roboto Mono', Menlo` | codes, full codes |
| `primary` | `#132a3f` (deep navy) | brand, buttons, selection |
| `primaryBg` | `#e7eef8` (pale blue) | selected row / active filter |
| `accent` | `#ffcd02` (brand yellow) | active rail, logo accent |
| `success` | `#1f8a5b` / bg `#e7f7f1` | active, approve |
| `danger` | `#c8421b` / bg `#fdebe3` | delete, restricted |
| `warning` | `#b88600` / bg `#fff8e1` | contra, washed-out |
| `info` | `#4d69fa` / bg `#eef2fb` | DEBIT, master-data |
| `violet` | `#6c5dd3` / bg `#f1efff` | Sub GL |
| Canvas / surface | `#f1f1f1` / `#ffffff` | page bg / cards |
| Radius | card `1.5rem`, control `1rem`, pill `999px` | rounded, soft |
| Shadow sm/md/lg | per `IFAS.shadow` | cards/drawers/modals |

### 8.2 Layer colors (used for code chips, badges, filter dots)

| Layer | Color | Tint bg |
|---|---|---|
| category | `#132a3f` navy | `#e7eef8` |
| type | `#6c5dd3` violet | `#f1efff` |
| sub | `#4d69fa` blue | `#eef2fb` |
| gl | `#1f8a5b` teal | `#e7f7f1` |
| detail | `#c8421b` vermillion | `#fdebe3` |

### 8.3 Density presets (`data.jsx › DENSITY`)

Two presets drive row/chip/button/input padding & font sizes and tree `indentStep`
(comfortable: `rowPadY 12`, `indentStep 22`; compact: `rowPadY 7`, `indentStep 18`). Implement as a
`data-density` attribute on the workspace root + Tailwind variants, or a small context that returns
the sizing map.

### 8.4 Icons

Prototype uses **Material Icons**; W-System uses **lucide-react**. Map names (e.g.
`account_tree`→`ListTree`, `chevron_right`→`ChevronRight`, `auto_awesome`→`Sparkles`,
`verified_user`→`ShieldCheck`, `pending_actions`→`ClipboardClock`, `receipt_long`→`ScrollText`).
Maintain one mapping module to avoid drift.

---

## 9. Data Model & Schema Changes

### 9.1 `public.coa` — additions

Most attribute columns already exist (§2.5). Add the **Detail-Ledger / hierarchy** gaps:

```sql
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS coa_full_code text,                 -- e.g. '1-1-01-1-2000' (derived, stored for search/sort)
  ADD COLUMN IF NOT EXISTS segment_code  text,                 -- per-layer segment shown as the code chip ('01','2000')
  ADD COLUMN IF NOT EXISTS name_en       text,                 -- English name (inspector)
  ADD COLUMN IF NOT EXISTS required_sub_gl        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_washed_out_account  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_child         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS child_upstream_id      uuid REFERENCES public.coa(id),  -- Sub-DL parent (self-ref)
  ADD COLUMN IF NOT EXISTS child_source_master_data text;       -- 'KEY_IN' | MASTER_DATA_* constant

CREATE INDEX IF NOT EXISTS idx_coa_full_code ON public.coa(tenant_id, coa_full_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coa_child_upstream ON public.coa(child_upstream_id) WHERE deleted_at IS NULL;
```

**Decisions / notes**
- **Code convention:** existing WIT seed stores full-ish codes in `account_code` (e.g. `1-10000`),
  whereas the IFAS model separates **segment** vs **full** code. Recommendation: keep `account_code`
  as the canonical full code **or** introduce `segment_code` + derived `coa_full_code` and migrate.
  Pick one and document; the FE needs both "chip code" (segment) and "full code". → **Open question OQ-1.**
- **Layer naming:** DB uses `sub_account|general_ledger|detail_ledger`; the FE prototype uses
  `sub|gl|detail`. Standardize on the **DB names** server-side and map to short keys in one FE
  constant (`LAYER`). Avoid leaking two vocabularies.
- **D/K:** DB `normal_balance` is `debit|credit` (lowercase); prototype `dk` is `DEBIT|CREDIT`.
  Normalize at the repository boundary.

### 9.2 New tables

```sql
-- Sub GL attribute-level configuration (deepest DL only)
CREATE TABLE public.coa_sub_gl_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  coa_id          uuid NOT NULL REFERENCES public.coa(id),
  attribute_level int  NOT NULL,                 -- 1..n, ordered
  is_pull_master_data boolean NOT NULL DEFAULT true,
  source_master_data  text,                      -- MASTER_DATA_* | NULL (key-in)
  source_column       text,                      -- e.g. KARYAWAN_NIK | NULL
  key_in_rows     jsonb,                         -- [{kode,nama}] for key-in levels
  created_at timestamptz DEFAULT now(),
  UNIQUE (coa_id, attribute_level)
);

-- Sub GL values (lazy get-or-create at posting; read-only catalog in UI)
CREATE TABLE public.coa_sub_gl_value (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  coa_id       uuid NOT NULL REFERENCES public.coa(id),
  composite_kode text NOT NULL,                  -- '01-001'
  composite_nama text NOT NULL,                  -- 'KENDARAAN › KENDARAAN LISTRIK'
  source_type  text NOT NULL CHECK (source_type IN ('MASTER_DATA','KEY_IN')),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  UNIQUE (coa_id, composite_kode)
);

-- Pending approvals (master data → DL generation)
CREATE TABLE public.coa_pending_approval (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  source_type   text NOT NULL,                   -- 'New Currency' | 'New Supplier' | ...
  name          text NOT NULL,
  code          text,
  requested_by  text,
  requested_at  timestamptz DEFAULT now(),
  target_parent text,
  generates_count int NOT NULL DEFAULT 0,
  estimated_dls jsonb,                           -- [{coaFullCode,name}]
  master_data_payload jsonb,
  risk_level    text CHECK (risk_level IN ('low','medium','high')),
  risk_note     text,
  status        text NOT NULL DEFAULT 'PENDING'  -- PENDING|APPROVED|REJECTED
);

-- Immutable audit log (ISO 27001 / SOX 404)
CREATE TABLE public.coa_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  action        text NOT NULL CHECK (action IN ('CREATE','EDIT','DELETE','CONFIG','STATUS','APPROVAL','IMPORT')),
  severity      text NOT NULL CHECK (severity IN ('low','medium','high')),
  actor_nik     text, actor_nama text,
  target_coa_id uuid, target_coa_code text, target_name text, target_layer text,
  field         text,
  before_data   jsonb, after_data jsonb,
  note          text, session_ip text,
  created_at    timestamptz DEFAULT now()
);
-- Append-only: no UPDATE/DELETE grants; enforce via RLS + revoked privileges.
```

> RLS: follow the finance matrix (`04-data-dictionary §5.2`) already referenced by `finance-coa.ts`.
> Audit/approval tables are tenant-scoped; audit log is **append-only**.

### 9.3 Type regeneration

After migrations, regenerate `apps/web/src/types/database.ts` (Supabase types) — current types omit
`cash_flow_category` and all layer-flag columns.

---

## 10. API Contract

Extend `apps/web/app/api/finance/coa/route.ts` + repository. Keep the bare JSON shape the FE already
expects (document it explicitly). Proposed surface:

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/coa?tree=true` | Full hierarchy (already exists; **wire the FE to it**) |
| `GET /api/finance/coa?layer=detail_ledger` | Filter by layer |
| `GET /api/finance/coa?q=...` | Search code/name/full-code (server-side option) |
| `POST /api/finance/coa` | Create (layer-aware payload incl. DL flags, `child_upstream_id`) |
| `PUT /api/finance/coa?id=` | Update; recursive for Sub-DL where applicable |
| `DELETE /api/finance/coa?id=` | Soft-delete; blocked if children **or** journal usage |
| `GET /api/finance/coa/[id]/sub-gl/config` | List attribute levels |
| `POST/PUT/DELETE …/sub-gl/config` | Manage Sub GL levels (logs `CONFIG`) |
| `GET …/sub-gl/values?page=&limit=&search=` | **Lazy** value catalog |
| `GET /api/finance/coa/approvals` · `POST …/approvals/approve` · `…/reject` | Pending-approval workflow |
| `GET /api/finance/coa/audit?action=&severity=&q=` | Audit log |
| `POST /api/finance/coa/import` · `GET …/import/history` | Import + history |
| `GET /api/finance/coa/export` | CSV/Excel export |

**Cross-cutting:** every mutation writes a `coa_audit_log` row; honor idempotency for batch creates;
return field-level validation errors (code width, duplicates, max-count, depth guards) so the FE can
surface the same toasts as the prototype.

---

## 11. Interaction Flows

### 11.1 Create account (layer-aware)

1. Header **+ Akun Baru** → `create` modal. 2. Pick **Layer**; form adapts (NB only for `category`;
parent `SearchableSelect` for others). 3. Enter segment **Kode** + **Nama** (+EN) + layer attributes.
4. Live `HierarchyPath` shows ancestry + `[NEW]` node. 5. Save → validate → insert (NB cascades) →
toast → select new node → `CREATE` audit.

### 11.2 Add Sub Akun (Sub Account / GL)

Inspector → **+ Tambah Sub Akun** → multi-row key-in (1 row = 1 child). Validate code width
(`sub`=2-digit, `gl`=1-digit 1–9), in-list + existing duplicates, max-count (99 / 9). Batch insert;
`coa_full_code` replaces the parent's last segment. Auto-expand parent.

### 11.3 Add Sub-DL (Detail Ledger children)

Inspector (DL) → **+ Tambah Sub Akun** → choose **Key-In** (batch, 4-digit, unique) or **Master Data**
(source + column → generated preview). On first child, parent's Sub GL config is **cleared** and
posting moves to the leaf. Enforce `MAX_SUB_DL_LEVEL = 2` via `canAcceptSubDl`.

### 11.4 Configure Sub GL (deepest DL)

Inspector → **Sub GL Configuration** → toggle **Required** → add **attribute levels** (Master-Data
`source.column` or Key-In rows). Multi-level → composite preview. **Lihat N Sub GL Value** opens the
lazy, paged value drawer. Logs `CONFIG` (high).

### 11.5 Pending approval → DL generation

Quick Actions → **Pending approvals** → review item (**Preview** shows estimated DLs + risk + payload)
→ select → **Approve N** (BE generates X DLs) / **Reject N** (+ note). Logs `APPROVAL`.

### 11.6 Audit & Import/Export

**Audit trail**: filter by action/severity/search; expand before/after diff. **Import**: upload →
preview → commit with partial-failure reasons; **history** lists complete/partial/failed runs.
**Export**: CSV/Excel (full or layer/category-filtered).

---

## 12. Phased Implementation Plan

> Each phase is shippable. Phases 1–2 deliver the **UI/UX revamp** the request centers on; 3–5 add the
> deeper subsystems. Gate features behind a flag if rolling out incrementally.

### Phase 0 — Foundations (S–M) ✅ **Done**
- IFAS tokens in `theme.ts` (palette, layer colors, density presets) + self-hosted Poppins
  scoped to `.coa-workspace` in shared globals.
- Primitives built: `LayerBadge`, `CodeChip`, `DKChip`, `StatusDot`, `SubGlChip`, `DensityToggle`,
  `SearchableSelect` (self-contained combobox — UI pkg has no command/popover), `HierarchyPath`.
- `coa_full_code`/`segment_code` + Detail-Ledger migration added
  (`20260530000001_coa_segments_and_detail_ledger.sql`); FE also derives these client-side so the
  page works before the migration is applied. _Type regeneration + `GET ?tree=true` wiring pending
  (the explorer currently builds the hierarchy client-side from the flat list)._

### Phase 1 — Explorer shell + tree (L) ✅ **Done** ← *core revamp*
- Page header card + toolbar (density, expand/collapse, import*, export, inspector, +Akun Baru).
- Layer filter panel with counts; global search w/ auto-expand; `TreeRow` tree-table.
- Replaced flat table; Create/Edit/Delete now use **`SearchableSelect` + live HierarchyPath**
  (raw-UUID parent input removed); type-to-confirm delete. Restyled `/finance/coa/[id]` GL page.
  _(*Import + the panel quick-actions are placeholders until Phases 4–5.)_

### Phase 2 — Inspector + Sub Akun (L)
- Inspector drawer (properties, hierarchy path, audit mini, actions).
- `SubChildrenSection` (sub/gl) + `SubDlChildrenSection` with batch create + all validations.
- Layer-aware Create/Edit modals (NB cascade, contra/restriction/DL flags).

### Phase 3 — Sub GL (XL)
- `coa_sub_gl_config` + `coa_sub_gl_value` tables + endpoints (lazy values).
- `SubGlConfigSection`, `SubGlLevelModal` (+composite preview), `SubGlValueDrawer`.

### Phase 4 — Approvals + Audit (L)
- `coa_pending_approval` + `coa_audit_log` tables + endpoints (append-only audit).
- Pending-approvals & preview modals; audit-trail modal w/ diff; wire all mutations to audit writes.

### Phase 5 — Import/Export (M)
- CSV/Excel import (preview + partial-failure), export, import/export history modal.

---

## 13. Accessibility, i18n & Performance

- **A11y:** tree uses `role="treegrid"` / `role="row"` + `aria-level` / `aria-expanded` /
  `aria-selected` (already in the prototype). Keyboard: ↑↓ navigate, → expand, ← collapse, ⏎ select,
  ⌘F search (surface the footer hints). Drawers/modals are `role="dialog" aria-modal`; trap focus;
  ESC closes. Ensure AA contrast (the IFAS tokens were darkened for AA — keep those values).
- **i18n:** UI copy is **Indonesian** with the domain terms in §5.6; account names carry an EN
  variant (`name_en`). Centralize strings for future localization.
- **Performance:** memoize `TreeRow`; build the tree once (`buildHierarchy`) and `flatten` only
  expanded nodes; React Query for the tree with `staleTime` ~5min; **lazy** Sub GL values
  (paged, never embedded in the tree/dropdown); virtualize the tree if a tenant exceeds a few
  thousand visible rows.

---

## 14. Risks & Open Questions

| ID | Item | Recommendation |
|---|---|---|
| OQ-1 | `account_code` (full vs segment) mismatch between WIT seed (`1-10000`) and IFAS model (`1-1-01-1-2000`) | ✅ **Resolved — migrate to true segments.** `account_code`/`coa_full_code` hold the full path; `segment_code` holds the per-layer chip code (migration added; new accounts build `parent.fullCode + '-' + segment`). |
| OQ-2 | Layer vocabulary (`sub_account/general_ledger/detail_ledger` vs `sub/gl/detail`) | ✅ Implemented — DB names server-side; `theme.ts › toFeLayer/toDbLayer` map to short FE keys. |
| OQ-3 | Master Data sources (Karyawan/Supplier/…) — do real tables/endpoints exist to back Sub GL? | ✅ **Resolved — defer.** Source data is still nil; Sub GL master-data integration is out of scope until the master tables exist. |
| OQ-4 | Should `account_type` (asset/liability/…) be **derived** from Category, or stay independent? | Open — currently cascades `account_type` from the parent on create. Prefer deriving from `enum_laporan_keuangan_category` later to avoid drift. |
| OQ-5 | Approval workflow ownership — does another module already emit "new master data" events? | Open (Phase 4) — align the trigger source before building the queue. |
| OQ-6 | Scope of this revamp — UI/UX-only (Phases 0–2) vs full (0–5)? | ✅ **Resolved — full scope (0–5) committed.** Phases 0–1 shipped; 2–5 to follow. |
| R-1 | Stale `database.ts` types hide existing columns → silent FE bugs | Regenerate types in Phase 0. |
| R-2 | Deleting/altering accounts referenced by journals | Keep the journal-usage guard; surface usage counts (prototype shows them) before delete. |
| R-3 | Tree performance at scale | Lazy values + virtualization fallback (§13). |

---

## Appendix A — COA Full Code Anatomy

```
1-1-01-1-2000
│ │  │  │ └── Detail Ledger  (4 digits)  → KAS KECIL
│ │  │  └──── General Ledger (1 digit)   → KAS IDR
│ │  └─────── Sub Account    (2 digits)  → KAS DAN SETARA KAS
│ └────────── Account Type   (1 digit)   → AKTIVA LANCAR
└──────────── Account Category (1 digit) → AKTIVA

Full name (ID): AKTIVA - AKTIVA LANCAR - KAS DAN SETARA KAS - KAS IDR - KAS KECIL

With Sub-DL (max 2 levels):
1-1-01-1-2000-2001         → Sub-DL Lv1 (KAS KECIL PUSAT)
1-1-01-1-2000-2001-2011    → Sub-DL Lv2 (deepest: posts & may carry Sub GL)
```

## Appendix B — Layer & Token Reference

**Layers**

| Layer | DB `coa_layer` | FE key | Color | Max self-children | Code width |
|---|---|---|---|---|---|
| Account Category | `category` | `category` | navy `#132a3f` | — | 1 |
| Account Type | `type` | `type` | violet `#6c5dd3` | — | 1 |
| Sub Account Type | `sub_account` | `sub` | blue `#4d69fa` | 1 level (≤99) | 2 |
| General Ledger | `general_ledger` | `gl` | teal `#1f8a5b` | 1 level (≤9) | 1–2 |
| Detail Ledger | `detail_ledger` | `detail` | vermillion `#c8421b` | Sub-DL ≤2 levels | 4 |

**Attribute flags by layer** (UI label → API field)

| Layer | Flag (UI → API) |
|---|---|
| Category | Normal Balance → `normal_balance` (input here only; cascades) |
| Type | Contra Account → `contra_account` |
| Sub / GL | Restriction → `is_restricted` (GL may override parent) |
| Detail Ledger | Sub GL → `required_sub_gl` · Washed Out → `is_washed_out_account` · Required Child → `required_child` |

**Master Data sources for Sub GL**

`MASTER_DATA_M_PEMILIK` · `_M_KARYAWAN` (NIK) · `_M_SUPPLIER` · `_M_CUSTOMER` · `_M_VALUTA` ·
`_M_KELOMPOK_FIXED_ASSET` · `_M_SUB_KELOMPOK_FIXED_ASSET` · `_M_BANK`.

---

*Prepared from: current code (`apps/web/app/finance/coa/**`, `apps/web/lib/repositories/finance-coa.ts`,
`apps/web/app/api/finance/coa/route.ts`, `supabase/migrations/20260528000001_coa_layer_flags.sql`,
`…_seed_wit_coa.sql`) and the IFAS/UBS Gold design handoff (`Chart_of_Account_standalone.html`,
`coa-standalone/*.jsx`, `IFAS COA Structure Knowledge R0.md`).*
