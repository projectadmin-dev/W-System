// Organization Structure Types & Initial Data

export interface Department {
  id: string
  code: string
  name: string
  employees: number
  head?: string
  description?: string
  status: "Active" | "Inactive"
}

export interface Division {
  id: string
  code: string
  name: string
  companyId: string
}

export interface JobTitle {
  id: string
  code: string
  name: string
  companyId: string
  levelId: string
}

export interface JobLevel {
  id: string
  code: string
  name: string
  grade: string
  minSalary: number
  maxSalary: number
}

export interface WorkArea {
  id: string
  code: string
  name: string
  location: string
  type: "Office" | "WFH" | "Hybrid"
}

// Mock initial data for UI demonstration
export const initialDepartments: Department[] = [
  {
    id: "dept-1",
    code: "ENG",
    name: "Engineering",
    employees: 45,
    head: "Budi Santoso",
    description: "Dev & Technical",
    status: "Inactive",
  },
  {
    id: "dept-2",
    code: "HR",
    name: "Human Resources",
    employees: 8,
    head: "Citra Lestari",
    description: "HR & Admin",
    status: "Active",
  },
  {
    id: "dept-3",
    code: "FIN",
    name: "Finance",
    employees: 12,
    head: "Andi Pratama",
    description: "Accounting & Finance",
    status: "Active",
  },
]

export const initialDivisions: Division[] = [
  { id: "div-1", code: "DIV-A", name: "Division A", companyId: "comp-1" },
  { id: "div-2", code: "DIV-B", name: "Division B", companyId: "comp-1" },
  { id: "div-3", code: "DIV-C", name: "Division C", companyId: "comp-2" },
]

export const initialJobTitles: JobTitle[] = [
  { id: "jt-1", code: "MGR", name: "Manager", companyId: "comp-1", levelId: "level-4" },
  { id: "jt-2", code: "DEV", name: "Developer", companyId: "comp-1", levelId: "level-2" },
  { id: "jt-3", code: "QA", name: "QA Engineer", companyId: "comp-1", levelId: "level-2" },
  { id: "jt-4", code: "HR", name: "HR Officer", companyId: "comp-2", levelId: "level-1" },
]

export const initialJobLevels: JobLevel[] = [
  {
    id: "level-1",
    code: "L1",
    name: "Junior",
    grade: "1",
    minSalary: 5000000,
    maxSalary: 8000000,
  },
  {
    id: "level-2",
    code: "L2",
    name: "Senior",
    grade: "2",
    minSalary: 8000000,
    maxSalary: 12000000,
  },
  {
    id: "level-3",
    code: "L3",
    name: "Lead",
    grade: "3",
    minSalary: 12000000,
    maxSalary: 18000000,
  },
  {
    id: "level-4",
    code: "L4",
    name: "Manager",
    grade: "4",
    minSalary: 18000000,
    maxSalary: 25000000,
  },
]

export const initialWorkAreas: WorkArea[] = [
  { id: "wa-1", code: "HQ", name: "Headquarters", location: "Jakarta", type: "Office" },
  { id: "wa-2", code: "BR1", name: "Branch 1", location: "Bandung", type: "Office" },
  { id: "wa-3", code: "WFH", name: "Work from Home", location: "Anywhere", type: "WFH" },
]

// Helper functions
export function getCompanyName(companyId: string): string {
  const companies: { [key: string]: string } = {
    "comp-1": "PT. WIT Indonesia",
    "comp-2": "PT. WIT Workshop",
  }
  return companies[companyId] || "Unknown"
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}
