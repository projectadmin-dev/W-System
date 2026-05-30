# Test Plan — Account Payable (Pengelolaan Tagihan)

| | |
|---|---|
| **Module** | `/finance/account-payable` |
| **Version** | v1.0 |
| **Author** | QA Engineer |
| **Date** | 2026-05-30 |
| **Status** | Executed — **PARTIAL** (96.55% pass, 2 blocked by environment) |
| **References** | US-001…US-005 (Account Payable user stories), migration `20260529000005_account_payable_schema.sql` |

---

## 1. Objective

Verify that the Account Payable module correctly implements the five user stories:
input & duplicate prevention (US-001), approval workflow & payment (US-002),
AP aging report (US-003), cash-out forecast (US-004), and General Ledger
posting on approval (US-005) — in line with PSAK double-entry rules.

## 2. Scope

**In scope**
- Business logic: totals, duplicate key, AP-number generation, aging buckets,
  cash-out forecast, payment application, journal debit-line balancing.
- API contract & guards: create/list/detail/edit/delete, submit, approve,
  reject, pay (status guards, validation, audit trail, best-effort GL posting).
- Database integrity: `UNIQUE` duplicate constraint, `GENERATED` `amount_due`.

**Out of scope**
- UI/visual regression of the React page (manual smoke only).
- Authentication/RBAC (owned by platform layer).
- Performance/load.

## 3. Test Approach

| Layer | Technique | Tooling |
|---|---|---|
| Business logic | Automated unit tests against the **production** module `apps/web/lib/ap-logic.ts` (the API routes import the same functions) | `node --experimental-strip-types --test` (Node 22 `node:test`) |
| API / DB rules | Static verification against route handlers & schema, with file:line evidence | Code review |
| End-to-end (HTTP→Supabase) | Live execution | **Blocked** — CI runner network allowlist denies the VPS (`43.153.224.59:3001`) and Supabase host. Re-run on the VPS to clear. |

> The logic was refactored into a single shared module so the dashboard, the
> create endpoint, and the approval/payment endpoints all exercise the **same**
> code the tests cover — eliminating test/production drift.

## 4. Test Environment

- Node.js 22.22, `node:test` runner, TypeScript type-stripping.
- Next.js 16 App Router route handlers (`apps/web/app/api/finance/account-payable/**`).
- Supabase `public` schema; admin client bypasses RLS.
- Fixed clock `TODAY = 2026-05-30` for deterministic date math.

## 5. Traceability & Results

| User Story | Coverage | Cases | Result |
|---|---|---|---|
| **US-001** Input & duplikat | totals, item/header tax & discount, duplicate key, AP-number, required-field & 409 guards, generated `amount_due` | TC-001…010, IC-01…04 | ✅ Pass |
| **US-002** Approval & pembayaran | state machine (submit/approve/reject/pay/edit/delete), partial & full payment, overpay/non-positive guards, audit steps | TC-011…023, TC-044, IC-05…08, IC-11 | ✅ Pass |
| **US-003** AP Aging | Current/1-30/31-60/61-90/>90 buckets, PAID/REJECTED exclusion, sum & count, summary counts | TC-024…031, TC-042/043/045 | ✅ Pass |
| **US-004** Cash-out forecast | 4 weekly buckets, APPROVED-only, week boundaries, exclude overdue/non-approved | TC-032…036 | ✅ Pass |
| **US-005** GL posting | per-item net debit, drop zero/no-coa, fallback line, balance to `grand_total`, best-effort posting | TC-037…041, IC-09/10 | ✅ Pass |
| E2E live | create→approve→GL on deployed DB | IC-12, IC-13 | ⛔ Blocked (env) |

**Totals:** 58 cases · 56 PASS · 0 FAIL · 2 BLOCKED · **96.55%**.

## 6. Defects

None. No functional defect found. The 2 blocked cases are an **environment
constraint** (outbound network allowlist on the CI runner), not a product
defect; their acceptance criteria are independently covered by automated
(TC-024…036) and code-review (IC-02, IC-09) cases.

## 7. How to Reproduce

```bash
# Automated logic suite (45 cases)
node --experimental-strip-types --test apps/web/lib/__tests__/ap-logic.test.ts

# Log results to the QA dashboard (run in Supabase SQL Editor)
#   supabase/seed/qa_account_payable_seed.sql
# Then open: http://43.153.224.59:3001/finance/qa
```

## 8. Recommendation

Logic and contract are sound and ready. To reach 100% green, re-run the two
blocked end-to-end cases **on the VPS** (which has DB access) — e.g. a happy-path
`create → submit → approve (assert balanced journal) → pay (assert PAID)` plus a
duplicate `409` assertion. Sign-off: **conditionally approved** pending that
on-host E2E pass.
