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
          title: "User Management",
          url: "/users",
        },
        {
          title: "Shift Kerja",
          url: "/pengaturan/hc/shift",
        },
        {
          title: "Kalender Kerja",
          url: "/pengaturan/hc/kalender",
        },
        {
          title: "UMR Kota",
          url: "/pengaturan/hc/umr",
        },
        {
          title: "BPJS Config",
          url: "/pengaturan/hc/bpjs",
        },
        {
          title: "PPh21 Config",
          url: "/pengaturan/hc/pajak",
        },
        {
          title: "Komponen Gaji",
          url: "/pengaturan/hc/komponen-gaji",
        },
        {
          title: "Grade & Matrix",
          url: "/pengaturan/hc/grade",
        },
        {
          title: "Departemen",
          url: "/pengaturan/hc/departemen",
        },
        {
          title: "Jabatan",
          url: "/pengaturan/hc/jabatan",
        },
        {
          title: "Area Kerja",
          url: "/pengaturan/hc/area-kerja",
        },
        {
          title: "Aturan Lembur",
          url: "/pengaturan/hc/lembur",
        },
      ],
    },
    {
      title: "Leads Management",
      url: "#",
      icon: <BotIcon />,
      items: [
        {
          title: "Leads",
          url: "/leads",
        },
        {
          title: "New Lead",
          url: "/leads/new",
        },
      ],
    },
    {
      title: "Project Briefs",
      url: "#",
      icon: <FrameIcon />,
      items: [
        {
          title: "Kanban Board",
          url: "/projects/kanban",
        },
        {
          title: "New Project Brief",
          url: "/project-briefs/new",
        },
      ],
    },
    {
      title: "Finance & Accounting",
      url: "#",
      icon: <PieChartIcon />,
      items: [
        {
          title: "Finance Dashboard",
          url: "/finance",
        },
        {
          title: "Chart of Account",
          url: "/finance/coa",
        },
        {
          title: "Journal History",
          url: "/finance/journal",
        },
        {
          title: "Periods",
          url: "/finance/periods",
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
