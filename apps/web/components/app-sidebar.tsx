"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import {
  GalleryVerticalEndIcon,
  AudioLinesIcon,
  TerminalIcon,
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  FileStackIcon,
  ReceiptIcon,
  CreditCardIcon,
  CalculatorIcon,
  BarChart3Icon,
  LandmarkIcon,
  WalletIcon,
  ArrowLeftRightIcon,
  TargetIcon,
  ClipboardListIcon,
  UsersIcon,
  BuildingIcon,
  TruckIcon,
} from "lucide-react"

// Navigation data — organized by module
const data = {
  user: {
    name: "WIT.ID",
    email: "admin@wit.id",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "PT. Wira Inovasi Teknologi",
      logo: <GalleryVerticalEndIcon />,
      plan: "Enterprise",
    },
    {
      name: "WIT Consulting",
      logo: <AudioLinesIcon />,
      plan: "Business",
    },
  ],
  navMain: [
    {
      title: "HR Management",
      url: "#",
      icon: <TerminalSquareIcon />,
      items: [
        { title: "User Management", url: "/users" },
        { title: "Shift Kerja", url: "/pengaturan/hc/shift" },
        { title: "Kalender Kerja", url: "/pengaturan/hc/kalender" },
        { title: "UMR Kota", url: "/pengaturan/hc/umr" },
        { title: "BPJS Config", url: "/pengaturan/hc/bpjs" },
        { title: "PPh21 Config", url: "/pengaturan/hc/pajak" },
        { title: "Komponen Gaji", url: "/pengaturan/hc/komponen-gaji" },
        { title: "Grade & Matrix", url: "/pengaturan/hc/grade" },
        { title: "Departemen", url: "/pengaturan/hc/departemen" },
        { title: "Jabatan", url: "/pengaturan/hc/jabatan" },
        { title: "Area Kerja", url: "/pengaturan/hc/area-kerja" },
        { title: "Aturan Lembur", url: "/pengaturan/hc/lembur" },
      ],
    },
    {
      title: "Leads Management",
      url: "#",
      icon: <BotIcon />,
      items: [
        { title: "Leads", url: "/leads" },
        { title: "New Lead", url: "/leads/new" },
      ],
    },
    {
      title: "Project Briefs",
      url: "#",
      icon: <FrameIcon />,
      items: [
        { title: "Kanban Board", url: "/projects/kanban" },
        { title: "New Project Brief", url: "/project-briefs/new" },
      ],
    },
    {
      title: "Quotations",
      url: "#",
      icon: <FileTextIcon />,
      items: [
        { title: "Quotation List", url: "/quotations" },
        { title: "New Quotation", url: "/quotations/new" },
      ],
    },
    {
      title: "After Sales",
      url: "#",
      icon: <HeartHandshakeIcon />,
      items: [
        { title: "Dashboard", url: "/after-sales" },
        { title: "Client Relationship", url: "/after-sales/clients" },
        { title: "Surveys", url: "/after-sales/surveys" },
        { title: "Pengumuman", url: "/after-sales/pengumuman" },
      ],
    },

    // ─────────────────────────────────────────────────────
    // FINANCE & ACCOUNTING — ORGANIZED INTO 4 SUB-CATEGORIES
    // ─────────────────────────────────────────────────────
    {
      title: "Finance & Accounting",
      url: "#",
      icon: <PieChartIcon />,
      items: [
        // ── Daily Operations ──────────────────────────────
        {
          title: "🏦 Daily Operations",
          url: "#finance-daily",
          isCategoryHeader: true,
        },
        { title: "Finance Dashboard", url: "/finance" },
        { title: "Chart of Accounts", url: "/finance/coa" },
        { title: "Journal Entries", url: "/finance/journal" },
        { title: "Journal (New)", url: "/finance/journal/new" },
        { title: "Money Requests", url: "/finance/money-requests" },
        { title: "Petty Cash", url: "/finance/petty-cash" },
        { title: "Fiscal Periods", url: "/finance/periods" },

        // ── Transactions ──────────────────────────────────
        {
          title: "💳 Transactions",
          url: "#finance-transactions",
          isCategoryHeader: true,
        },
        { title: "Customer Invoices", url: "/finance/customer-invoices" },
        { title: "Vendor Bills", url: "/finance/vendor-bills" },
        { title: "Receipts (BKM)", url: "/finance/receipts" },
        { title: "Payments", url: "/finance/payments" },
        { title: "Payment Vouchers", url: "/finance/payment-vouchers" },
        { title: "Expense Tracking", url: "/finance/expenses" },

        // ── Reconciliation ────────────────────────────────
        {
          title: "⚖️ Reconciliation",
          url: "#finance-recon",
          isCategoryHeader: true,
        },
        { title: "Bank Reconciliation", url: "/finance/bank-reconciliation" },
        { title: "Payment Reconciliation", url: "/finance/payment-reconciliation" },
        { title: "Cash Register", url: "/finance/cash-register" },

        // ── Aging Analysis ────────────────────────────────
        {
          title: "📊 Aging Analysis",
          url: "#finance-aging",
          isCategoryHeader: true,
        },
        { title: "AR Aging (Piutang)", url: "/finance/ar-aging" },
        { title: "AP Aging (Hutang)", url: "/finance/ap-aging" },
        { title: "Budget vs Actual", url: "/finance/budget-vs-actual" },

        // ── Master Data ─────────────────────────────────
        {
          title: "👥 Master Data",
          url: "#finance-master",
          isCategoryHeader: true,
        },
        { title: "Customers", url: "/finance/customers" },
        { title: "Vendors", url: "/finance/vendors" },

        // ── Reporting ────────────────────────────────────
        {
          title: "📈 Financial Reports",
          url: "#finance-reports",
          isCategoryHeader: true,
        },
        { title: "Trial Balance", url: "/finance/reports/trial-balance" },
        { title: "Income Statement", url: "/finance/reports/profit-loss" },
        { title: "Balance Sheet", url: "/finance/reports/balance-sheet" },
        { title: "Cash Flow Statement", url: "/finance/reports/cash-flow-statement" },
        { title: "All Reports", url: "/finance/reports" },
        { title: "BI Dashboard", url: "/dashboard/bi" },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
