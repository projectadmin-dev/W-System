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
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon } from "lucide-react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: <GalleryVerticalEndIcon />,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: <AudioLinesIcon />,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: <TerminalIcon />,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "HR Management",
      url: "#",
      icon: <TerminalSquareIcon />,
      isActive: true,
      items: [
        {
          title: "Employee",
          url: "#",
        },
        {
          title: "Department",
          url: "#",
        },
        {
          title: "Division",
          url: "#",
        },
        {
          title: "Position",
          url: "#",
        },
        {
          title: "Attendance",
          url: "#",
        },
        {
          title: "Leave",
          url: "#",
        },
        {
          title: "Public Holiday",
          url: "#",
        },
        {
          title: "Reimburse",
          url: "#",
        },
        {
          title: "Payroll",
          url: "#",
        },
        {
          title: "Recruitment",
          url: "#",
        },
        {
          title: "Training",
          url: "#",
        },
      ],
    },
    {
      title: "Client Management",
      url: "#",
      icon: <BotIcon />,
      items: [
        {
          title: "Client",
          url: "#",
        },
        {
          title: "Company",
          url: "#",
        },
      ],
    },
    {
      title: "Leads Management",
      url: "#",
      icon: <BookOpenIcon />,
      items: [
        {
          title: "Pipeline",
          url: "#",
        },
        {
          title: "Stage",
          url: "#",
        },
        {
          title: "Leads",
          url: "#",
        },
        {
          title: "Product & Service",
          url: "#",
        },
      ],
    },
    {
      title: "Project Management",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        {
          title: "Project",
          url: "#",
        },
        {
          title: "Board Task",
          url: "#",
        },
        {
          title: "Timeline",
          url: "#",
        },
      ],
    },
    {
      title: "Transaction",
      url: "#",
      icon: <BookOpenIcon />,
      items: [
        {
          title: "Quotation",
          url: "#",
        },
        {
          title: "Order",
          url: "#",
        },
        {
          title: "Invoice",
          url: "#",
        },
        {
          title: "Receipt",
          url: "#",
        },
      ],
    },
    {
      title: "Finance & Accounting",
      url: "#",
      icon: <BookOpenIcon />,
      items: [
        {
          title: "Chart of Account",
          url: "#",
        },
        {
          title: "Journal History",
          url: "#",
        },
        {
          title: "General Ledger",
          url: "#",
        },
        {
          title: "Profit & Loss",
          url: "#",
        },
        {
          title: "Income Statement",
          url: "#",
        },
        {
          title: "Balance Sheet",
          url: "#",
        },
        {
          title: "Cash Flow",
          url: "#",
        },
        {
          title: "Forecast Cash Out",
          url: "#",
        },
        {
          title: "Forecast Cash In",
          url: "#",
        },
      ],
    },
    {
      title: "Report",
      url: "#",
      icon: <BookOpenIcon />,
      items: [
        {
          title: "Summary",
          url: "#",
        },
        {
          title: "Leads Monitoring",
          url: "#",
        },
        {
          title: "Transaction Monitoring",
          url: "#",
        },
        {
          title: "Project Monitoring",
          url: "#",
        },
        {
          title: "Finance Monitoring",
          url: "#",
        },
        {
          title: "Dynamic Report",
          url: "#",
        },
      ],
    },
    {
      title: "Configuration",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        {
          title: "Sidebar Menu",
          url: "#",
        },
        {
          title: "Access Management",
          url: "#",
        },
        {
          title: "Role",
          url: "#",
        },
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
