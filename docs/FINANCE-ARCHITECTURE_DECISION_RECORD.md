# FINANCE · Architecture Decision Record (ADR)

> **Purpose.** A single, authoritative log of architecture decisions that apply
> **across the entire finance domain** — not to one module. When a new finance
> module is built (AR monitoring, payroll, depreciation, tax config, …), it
> **inherits** these decisions instead of re-deciding (or re-documenting) them.
>
> **Scope rule.** A decision belongs here if it constrains *more than one*
> finance module, or is a domain-wide convention. Module-specific decisions stay
> in that module's `*-SPEC.md` (e.g. `FINANCE-JOURNAL_AUTOMATION-SPEC.md` §9).
>
> **Format.** Each record is immutable once `Accepted`. To change a decision,
> add a **new** ADR that supersedes it (never edit history) — mirroring the
> PSAK reversal-only principle the books themselves follow.
>
> **Status values:** `Accepted` · `Superseded by ADR-NNN` · `Deprecated` ·
> `Proposed`.

---

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| [001](#adr-001--reuse-the-existing-double-entry-core) | Reuse the existing double-entry core | Accepted | every module that posts journals |
| [002](#adr-002--psak-immutability--reversal-only-correction) | PSAK immutability — reversal-only correction | Accepted | all journals |
| [003](#adr-003--repository-conventions-tenant-uuid-soft-delete-actor-fk) | Repository conventions (tenant, UUID, soft-delete, actor FK) | Accepted | all finance tables |
| [004](#adr-004--config-as-data-over-hardcoded-mappings) | Config-as-data over hardcoded mappings | Accepted | mappings, rules, rates |
| [005](#adr-005--tax-rules-are-data-driven-and-consultant-validated) | Tax rules are data-driven and consultant-validated | Accepted | all tax logic |
| [006](#adr-006--automated-side-effects-are-non-blocking) | Automated side-effects are non-blocking | Accepted | all auto side-effects |
| [007](#adr-007--idempotency-on-source-type--source-id) | Idempotency on (source_type, source_id) | Accepted | source-driven generation |
| [008](#adr-008--pure-core--io-shell-separation) | Pure core / IO shell separation | Accepted | all calculation logic |
| [009](#adr-009--deploy-ordering-for-data-that-depends-on-new-code) | Deploy-ordering for data that depends on new code | Accepted | coupled migrations |
| [010](#adr-010--backward-compatible-opt-in-defaults) | Backward-compatible, opt-in defaults | Accepted | schema evolution |
| [011](#adr-011--shared-validation-between-api-and-ui) | Shared validation between API and UI | Accepted | guard-railed CRUD |

---

## ADR-001 — Reuse the existing double-entry core

**Status:** Accepted

**Context.** The original SDD proposed new `jurnal` / `jurnal_detail` tables. The
live system already had a PSAK-compliant `journal_entries` / `journal_lines` core
with balance validation, reversal, ≥2-line enforcement, fiscal-period assignment,
and immutability triggers.

**Decision.** Every finance module that produces accounting entries **reuses**
`journal_entries` / `journal_lines` and the `createJournalEntry()` /
`postJournalEntry()` repository — never a parallel ledger.

**Consequences.** One ledger, one balance authority, one source of truth for
reporting. New modules link via `source_type` + `source_id`. The `source_type`
whitelist must be extended (CHECK) for each new producer. No second reconciliation.

---

## ADR-002 — PSAK immutability & reversal-only correction

**Status:** Accepted

**Context.** PSAK 25 requires posted journals to be immutable; corrections are
made by reversing entries, not by editing or deleting.

**Decision.** A `posted` journal is **never edited or deleted**. Corrections post
a Dr/Cr-swapped **reversal** (`is_reversal=true`, `reversal_of_id` set). Entries
are inserted as `draft`, then posted (DB validates balance on the transition and
locks the row afterward).

**Consequences.** Full audit trail; the DB enforces it via
`prevent_posted_modification`. All tooling (engine, void handlers, backfill) must
use the reversal path. UIs show immutability banners. This same "append-only,
supersede-don't-mutate" philosophy is applied to this ADR log itself.

---

## ADR-003 — Repository conventions (tenant, UUID, soft-delete, actor FK)

**Status:** Accepted

**Context.** The app is single-tenant today (`00000000-0000-0000-0000-000000000001`)
but built on multi-tenant-ready conventions.

**Decision.** Every finance table carries: `tenant_id`, UUID PKs, `created_at` /
`updated_at` / `deleted_at` (soft-delete), and actor columns FK to
`user_profiles`. A valid `SYSTEM_USER` UUID is the fallback actor for
system-initiated rows. RLS is enabled (permissive `USING (true)` today, behind
service-role server routes).

**Consequences.** Consistent querying, auditability, and a clear path to tighten
RLS for true multi-tenancy. New tables that skip these break the convention.

---

## ADR-004 — Config-as-data over hardcoded mappings

**Status:** Accepted

**Context.** A hardcoded AP journal existed and could only change via code
deploy. Finance needs to adjust mappings without engineering.

**Decision.** Behavioral mappings (journal account/nominal mappings, and by
extension future rule sets) live in **database configuration**, edited through
guard-railed UI — not in code. Code provides the *engine*; data provides the
*policy*.

**Consequences.** Finance self-serves mapping changes; no deploy for a remap.
Requires: (a) a vocabulary whitelist enforced by DB CHECK, (b) validation shared
by API + UI (see ADR-011), (c) seeds that are idempotent. Trade-off: config
errors are a data concern — mitigated by validation + the always-balanced rule.

---

## ADR-005 — Tax rules are data-driven and consultant-validated

**Status:** Accepted

**Context.** Tax rates (PPh 2%/4%), tax bases (DPP — not always the full
subtotal), and applicability are **legal** decisions that change over time and
across tax types.

**Decision.** Rates and tax-base categories are stored as **data**
(`pph_tarif_default`, `dpp_kategori`), overridable per transaction, and snapshotted
on the document for audit. Adding a tax type/rate/category is a data change, not
a code change. The system models the **mechanism**; specific rates/applicability
**must be confirmed with a tax consultant before go-live.**

**Consequences.** Scalable to new taxes without engine edits. Per-transaction
snapshots keep historical entries correct when rates change. Legal disclaimer
must accompany any go-live. (PPN WAPU/DTP and PPh 4(2) final are deferred until a
real case exists — see the relevant SPEC §9.)

---

## ADR-006 — Automated side-effects are non-blocking

**Status:** Accepted

**Context.** Auto-journaling (and similar automation) runs after a business
transaction. A failure in the side-effect must not lose the business action.

**Decision.** Automated side-effects are **non-blocking (NFR-02)**: on failure
they log to an error table (e.g. `jurnal_error_log`) and return a result the
caller surfaces as a **warning**, never rolling back the business transaction.

**Consequences.** Business continuity over automation completeness. Requires an
error log + a way to retry/repair (the engine is idempotent, so re-running is
safe). Operators monitor the error log; a skipped journal is recoverable, a lost
payment is not.

---

## ADR-007 — Idempotency on (source_type, source_id)

**Status:** Accepted

**Context.** Routes can fire more than once (retries, double-clicks, re-approval).
Duplicate journals corrupt the books.

**Decision.** Source-driven generation is **idempotent**, keyed on
`(source_type, source_id)` for active (draft/posted, non-reversal) entries. A
source that already has an active journal is a no-op. Reversals are likewise
idempotent (skip an entry already reversed).

**Consequences.** Safe retries and backfills. Requires a unique source linkage
per logical event — hence separate payment-history rows (each its own source) for
partial payments, rather than re-journaling the parent document.

---

## ADR-008 — Pure core / IO shell separation

**Status:** Accepted

**Context.** Accounting and tax math must be trustworthy and testable without a
database or runtime.

**Decision.** Calculation logic lives in **pure modules** (no DB, no imports):
e.g. `journal-engine-core.ts`, `tax-withholding.ts`. A thin **IO shell**
(`journal-engine.ts`, `*-server.ts`) does DB reads/writes and calls the pure
core. Pure modules are unit-tested with `node --test`.

**Consequences.** Fast, dependency-free unit tests; the math is the part ported
*verbatim* in any migration. New finance calculations follow the same split.

---

## ADR-009 — Deploy-ordering for data that depends on new code

**Status:** Accepted

**Context.** A config/migration that reads a value only a *new* route supplies
(e.g. `kas_neto`) will misbehave if applied before that route is live.

**Decision.** Any data change that depends on new code is applied **after** the
code is deployed: ship code → deploy → then apply the coupled migration. Coupled
migrations are documented as such and designed so the intermediate window stays
correct (the new value is simply ignored by old config).

**Consequences.** Safe rollouts with no unbalanced/incorrect window. Requires
migrations to be labeled "coupled vs additive" and a rollout runbook
(see `*-MIGRATION.md` §3). Additive migrations remain apply-anytime.

---

## ADR-010 — Backward-compatible, opt-in defaults

**Status:** Accepted

**Context.** New features (e.g. withholding) must not alter existing rows or
already-posted journals.

**Decision.** New columns are nullable or defaulted so **every existing row
behaves exactly as before**; new behavior is **opt-in per transaction** (e.g.
`pph_dipotong_oleh` defaults `tidak_ada`, `ppn_dipungut_oleh` defaults `kita`).
Optional journal lines resolve to zero and are skipped → identical legacy output.

**Consequences.** Zero-impact schema evolution; no data backfill required to
deploy. Feature adoption is gradual and reversible by simply not opting in.

---

## ADR-011 — Shared validation between API and UI

**Status:** Accepted

**Context.** Guard-railed config CRUD must never let the UI submit a value the DB
would reject, and the server must never trust the client.

**Decision.** Validation vocabularies and rules live in **one shared module**
(e.g. `journal-config-options.ts` with `validateConfig()`), imported by **both**
the API route (authoritative) and the UI (live feedback). Token sets mirror the
DB CHECK constraints; tokens are dropdown-only, never free-text.

**Consequences.** The form cannot offer an invalid value; the server re-validates
regardless. One place to update when the vocabulary grows (must be changed in
lockstep with the DB CHECK and the engine's token set).

---

### How to add a new ADR

1. Append the next number; never reuse or reorder.
2. Fill `Context → Decision → Consequences`; set `Status: Accepted`.
3. To revise an existing decision, write a new ADR and mark the old one
   `Superseded by ADR-NNN` — do not edit the superseded record's body.
4. Add a row to the Index.
