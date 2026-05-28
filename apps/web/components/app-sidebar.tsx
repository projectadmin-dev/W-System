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
  UsersIcon as UsersIcon2,
  Building2Icon,
  Clock,
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
    // ─────────────────────────────────────────────────────────────────
    // HR MANAGEMENT — 3 sections: Master Data, Time, Compensation
    // ─────────────────────────────────────────────────────────────────
    {
      title: "HR Management",
      url: "/hr",
      icon: <UsersIcon2 />,
      items: [
        {
          title: "📋 MASTER DATA",
          url: "#hr-master",
          isCategoryHeader: true,
        },
        { title: "Entity Management", url: "/hr/master/entity" },
        { title: "Struktur Organisasi", url: "/hr/master/org-structure" },
        { title: "User Management", url: "/hr/master/users" },
        { title: "Employee Contracts", url: "/hr/master/contracts" },
        { title: "Pengaturan Kompensasi", url: "/hr/compensation" },

        {
          title: "🗂️ HR ADMINISTRATION",
          url: "#hr-admin",
          isCategoryHeader: true,
        },
        { title: "Kontrak Management", url: "/hr/master/contracts" },

        {
          title: "⏰ TIME & ATTENDANCE",
          url: "#hr-attendance",
          isCategoryHeader: true,
        },
        { title: "Attendance Dashboard", url: "/hr/attendance" },
        { title: "Attendance Logs", url: "/hr/attendance/logs" },
        { title: "Work Shifts", url: "/hr/config/shifts" },
        { title: "Work Calendars", url: "/hr/config/calendars" },
        { title: "Overtime Rules", url: "/hr/config/overtime" },

        {
          title: "💰 COMPENSATION & PAYROLL",
          url: "#hr-compensation",
          isCategoryHeader: true,
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // WORKFORCE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────
    {
      title: "Workforce Management",
      url: "/workforce",
      icon: <TargetIcon />,
      items: [
        {
          title: "👥 WORKFORCE",
          url: "#wf-workforce",
          isCategoryHeader: true,
        },
        { title: "Workforce Dashboard", url: "/workforce" },
        { title: "Workload Monitoring", url: "/workforce/workload" },
        { title: "Resource Allocation", url: "/workforce/resources" },
        { title: "Timesheet", url: "/workforce/timesheet" },

        {
          title: "📁 PROJECT",
          url: "#wf-project",
          isCategoryHeader: true,
        },
        { title: "Project Dashboard", url: "/workforce/projects" },
        { title: "Task Management", url: "/workforce/tasks" },
        { title: "Sprint Board", url: "/workforce/sprint" },

        {
          title: "📊 REPORTS",
          url: "#wf-reports",
          isCategoryHeader: true,
        },
        { title: "Utilization Report", url: "/workforce/reports/utilization" },
        { title: "Role Dashboard", url: "/workforce/reports/role-dashboard" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // LEADS MANAGEMENT
    // ─────────────────────────────────────────────────────────────────
    {
      title: "Leads Management",
      url: "#",
      icon: <BotIcon />,
      items: [
        { title: "Leads", url: "/leads" },
        { title: "New Lead", url: "/leads/new" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // PROJECT BRIEFS
    // ─────────────────────────────────────────────────────────────────
    {
      title: "Project Briefs",
      url: "#",
      icon: <FrameIcon />,
      items: [
        { title: "Kanban Board", url: "/projects/kanban" },
        { title: "New Project Brief", url: "/project-briefs/new" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // QUOTATIONS
    // ─────────────────────────────────────────────────────────────────
    {
      title: "Quotations",
      url: "#",
      icon: <FileTextIcon />,
      items: [
        { title: "Quotation List", url: "/quotations" },
        { title: "New Quotation", url: "/quotations/new" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // AFTER SALES
    // ─────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────
    // COMMERCIAL CALCULATOR
    // ─────────────────────────────────────────────────────────────────
    {
      title: "Commercial",
      url: "#",
      icon: <CalculatorIcon />,
      items: [
        { title: "Calculator", url: "/commercial" },
        { title: "Projects", url: "/commercial/projects" },
        { title: "Master Rate Cards", url: "/commercial/rate-cards" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // FINANCE & ACCOUNTING — ORGANIZED INTO 4 SUB-CATEGORIES
    // ─────────────────────────────────────────────────────────────────
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
        { title: "AR Monitoring", url: "/finance/ar-monitoring" },
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
        { title: "Laporan Keuangan", url: "/finance/laporan-keuangan" },
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
