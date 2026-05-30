import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// SLA target per document (hours) — mirrors reference "Target 4 jam / dokumen"
const SLA_TARGET_HOURS = 4

export type ApprovalModule = 'PU' | 'AP'
export type Priority = 'high' | 'medium' | 'low'
export type SLAState = 'ok' | 'risk' | 'breached'

// Normalized document shape consumed by the Approval Dashboard UI
export interface ApprovalDoc {
  id: string
  module: ApprovalModule
  module_label: string
  doc_number: string
  amount: number
  currency: string
  requestor_name: string
  counterparty: string
  status: string
  due_date: string | null
  overdue_days: number | null
  submitted_at: string | null
  created_at: string
  priority: Priority
  sla: SLAState
  sla_hours: number
  detail_url: string
}

export interface ActivityItem {
  id: string
  module: ApprovalModule
  action: string            // SUBMIT | APPROVE | REJECT | PAY
  actor_name: string
  doc_label: string
  notes: string | null
  at: string
}

// ── derivation helpers ───────────────────────────────────────────────────────
function derivePriority(amount: number, overdueDays: number | null): Priority {
  if (overdueDays !== null && overdueDays > 0) return 'high'
  if (amount >= 10_000_000) return 'high'
  if (amount >= 1_000_000) return 'medium'
  return 'low'
}

function deriveSLA(submittedAt: string | null, createdAt: string): { state: SLAState; hours: number } {
  const ref = submittedAt ? new Date(submittedAt) : new Date(createdAt)
  const hours = Math.max(0, (Date.now() - ref.getTime()) / 3_600_000)
  let state: SLAState = 'ok'
  if (hours > SLA_TARGET_HOURS) state = 'breached'
  else if (hours > SLA_TARGET_HOURS / 2) state = 'risk'
  return { state, hours: Math.round(hours * 10) / 10 }
}

function overdueDaysOf(due: string | null): number | null {
  if (!due) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due); d.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  return diff > 0 ? diff : null
}

function buildDoc(args: {
  id: string; module: ApprovalModule; doc_number: string; amount: number; currency: string
  requestor_name: string; counterparty: string; status: string
  due_date: string | null; submitted_at: string | null; created_at: string; detail_url: string
}): ApprovalDoc {
  const overdue_days = overdueDaysOf(args.due_date)
  const priority = derivePriority(args.amount, overdue_days)
  const { state, hours } = deriveSLA(args.submitted_at, args.created_at)
  return {
    ...args,
    module_label: args.module === 'PU' ? 'PERMINTAAN UANG' : 'PENGELOLAAN TAGIHAN',
    overdue_days,
    priority,
    sla: state,
    sla_hours: hours,
  }
}

export async function GET(_request: NextRequest) {
  try {
    const db = createAdminClient()

    // ── Permintaan Uang ──────────────────────────────────────────────────────
    const { data: puRows } = await db
      .from('permintaan_uang')
      .select(`
        id, doc_number, status, nominal, mata_uang,
        requestor_name, dasar_pengajuan, project_id, project_name,
        tanggal_kebutuhan, submitted_at, approved_at, paid_at, created_at,
        projects:project_id(project_name)
      `)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .in('status', ['PENDING_APPROVAL', 'APPROVED', 'PAID'])
      .order('created_at', { ascending: false })
      .limit(200)

    // ── Account Payable ──────────────────────────────────────────────────────
    const { data: apRows } = await db
      .from('ap_invoices')
      .select(`
        id, ap_number, status, grand_total, amount_due, mata_uang,
        pihak_ketiga, deskripsi, project_name,
        tgl_jatuh_tempo, submitted_at, approved_at, paid_at, created_at
      `)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .in('status', ['SUBMITTED', 'APPROVED', 'PAID'])
      .order('created_at', { ascending: false })
      .limit(200)

    const puDocs: { status: string; doc: ApprovalDoc }[] = (puRows ?? []).map((r: any) => {
      const projName = Array.isArray(r.projects) ? r.projects[0]?.project_name : r.projects?.project_name
      return {
        status: r.status,
        doc: buildDoc({
          id: r.id, module: 'PU', doc_number: r.doc_number,
          amount: Number(r.nominal ?? 0), currency: r.mata_uang ?? 'IDR',
          requestor_name: r.requestor_name ?? '—',
          counterparty: r.dasar_pengajuan === 'PROJECT'
            ? (projName ?? r.project_name ?? 'Project')
            : 'Internal',
          status: r.status,
          due_date: r.tanggal_kebutuhan ?? null,
          submitted_at: r.submitted_at ?? null,
          created_at: r.created_at,
          detail_url: `/finance/permintaan-uang/${r.id}`,
        }),
      }
    })

    const apDocs: { status: string; doc: ApprovalDoc }[] = (apRows ?? []).map((r: any) => ({
      status: r.status,
      doc: buildDoc({
        id: r.id, module: 'AP', doc_number: r.ap_number,
        amount: Number(r.grand_total ?? 0), currency: r.mata_uang ?? 'IDR',
        requestor_name: r.deskripsi ? String(r.deskripsi).slice(0, 40) : '—',
        counterparty: r.pihak_ketiga ?? '—',
        status: r.status,
        due_date: r.tgl_jatuh_tempo ?? null,
        submitted_at: r.submitted_at ?? null,
        created_at: r.created_at,
        detail_url: `/finance/account-payable?focus=${r.id}`,
      }),
    }))

    const all = [...puDocs, ...apDocs]

    // Buckets
    const waiting = all
      .filter(x => x.status === 'PENDING_APPROVAL' || x.status === 'SUBMITTED')
      .map(x => x.doc)
    const awaiting = all
      .filter(x => x.status === 'APPROVED')
      .map(x => x.doc)
    const paid = all
      .filter(x => x.status === 'PAID')
      .map(x => x.doc)

    // Sort waiting by SLA breach severity (most-breached first), then amount
    const slaRank: Record<SLAState, number> = { breached: 0, risk: 1, ok: 2 }
    waiting.sort((a, b) => slaRank[a.sla] - slaRank[b.sla] || b.amount - a.amount)
    awaiting.sort((a, b) => b.amount - a.amount)
    paid.sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))

    // ── Recent Activity (merge both audit trails) ────────────────────────────
    const puIds = (puRows ?? []).map((r: any) => r.id)
    const apIds = (apRows ?? []).map((r: any) => r.id)
    const docNumByPU: Record<string, string> = {}
    for (const r of puRows ?? []) docNumByPU[r.id] = r.doc_number
    const docNumByAP: Record<string, string> = {}
    for (const r of apRows ?? []) docNumByAP[r.id] = r.ap_number

    const activity: ActivityItem[] = []

    if (puIds.length > 0) {
      const { data: puSteps } = await db
        .from('pu_approval_steps')
        .select('id, permintaan_uang_id, status, approver_name, notes, actioned_at, created_at')
        .eq('tenant_id', TENANT)
        .in('permintaan_uang_id', puIds)
        .order('created_at', { ascending: false })
        .limit(40)
      for (const s of puSteps ?? []) {
        activity.push({
          id: s.id, module: 'PU',
          action: s.status === 'APPROVED' ? 'APPROVE' : s.status === 'REJECTED' ? 'REJECT' : 'SUBMIT',
          actor_name: s.approver_name ?? 'System',
          doc_label: docNumByPU[s.permintaan_uang_id] ?? 'PU',
          notes: s.notes ?? null,
          at: s.actioned_at ?? s.created_at,
        })
      }
    }

    if (apIds.length > 0) {
      const { data: apSteps } = await db
        .from('ap_approval_steps')
        .select('id, ap_invoice_id, action, actor_name, notes, created_at')
        .in('ap_invoice_id', apIds)
        .order('created_at', { ascending: false })
        .limit(40)
      for (const s of apSteps ?? []) {
        activity.push({
          id: s.id, module: 'AP',
          action: s.action ?? 'SUBMIT',
          actor_name: s.actor_name ?? 'System',
          doc_label: docNumByAP[s.ap_invoice_id] ?? 'AP',
          notes: s.notes ?? null,
          at: s.created_at,
        })
      }
    }

    activity.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    const recentActivity = activity.slice(0, 30)

    // ── Summary ──────────────────────────────────────────────────────────────
    const priority = { high: 0, medium: 0, low: 0 }
    const sla = { ok: 0, risk: 0, breached: 0 }
    for (const d of waiting) {
      priority[d.priority]++
      sla[d.sla]++
    }

    const sevenDaysAgo = Date.now() - 7 * 86_400_000
    const activityCount = recentActivity.filter(a => new Date(a.at).getTime() >= sevenDaysAgo).length

    return NextResponse.json({
      summary: {
        waiting_count: waiting.length,
        awaiting_count: awaiting.length,
        activity_count: activityCount,
        priority,
        sla,
      },
      waiting,
      awaiting,
      paid,
      activity: recentActivity,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
