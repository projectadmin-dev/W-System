"use client"
export interface Company { id: string; code: string; name: string }
export interface BaseOrgItem { id: string; code: string; name: string; companyId: string; description?: string }
export interface Department extends BaseOrgItem { head?: string; employees: number; children?: Pick<Department, "id"|"code"|"name"|"companyId"|"head"|"employees">[] }
export interface Division extends BaseOrgItem { departmentId?: string }
export interface JobTitle extends BaseOrgItem { divisionId?: string; levelId?: string }
export interface JobLevel extends BaseOrgItem { grade: string; minSalary?: number; maxSalary?: number }
export interface WorkArea extends BaseOrgItem { location?: string; type: "Office" | "Site" | "Remote" | "Warehouse" }
export type FormType = "department" | "division" | "job-title" | "job-level" | "work-area"
export const companies = [
  { id: "comp-1", code: "WIT", name: "PT. Wira Inovasi Teknologi" },
  { id: "comp-2", code: "WITC", name: "WIT Consulting" },
  { id: "comp-3", code: "WITD", name: "WIT Digital Solutions" },
]
export const getCompanyName = (companyId: string) => companies.find((c) => c.id === companyId)?.name || companyId
export const getCompanyCode = (companyId: string) => companies.find((c) => c.id === companyId)?.code || "N/A"
export const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num)
export const initialDepartments = [
  { id: "dept-eng", code: "ENG", name: "Engineering", companyId: "comp-1", description: "Dev & Technical", head: "Budi Santoso", employees: 45, children: [
    { id: "dept-dev", code: "DEV", name: "Development", companyId: "comp-1", head: "Andi Wijaya", employees: 30 },
    { id: "dept-qa", code: "QA", name: "QA & Testing", companyId: "comp-1", head: "Citra Lestari", employees: 15 },
  ]},
  { id: "dept-hr", code: "HR", name: "Human Resources", companyId: "comp-1", description: "People & Talent", head: "Dewi Kusuma", employees: 8 },
  { id: "dept-fin", code: "FIN", name: "Finance", companyId: "comp-1", description: "Financial Ops", head: "Eko Prasetyo", employees: 12 },
  { id: "dept-sales", code: "SLS", name: "Sales & Marketing", companyId: "comp-2", description: "Biz Dev", head: "Fajar Nugroho", employees: 20 },
  { id: "dept-ops", code: "OPS", name: "Operations", companyId: "comp-3", description: "Field Ops", head: "Gita Maharani", employees: 35 },
]
export const initialDivisions = [
  { id: "div-001", code: "WEB", name: "Web Dev", companyId: "comp-1", departmentId: "dept-eng" },
  { id: "div-002", code: "MOB", name: "Mobile Dev", companyId: "comp-1", departmentId: "dept-eng" },
  { id: "div-003", code: "INF", name: "Infrastructure", companyId: "comp-1", departmentId: "dept-eng" },
  { id: "div-004", code: "REC", name: "Recruitment", companyId: "comp-1", departmentId: "dept-hr" },
  { id: "div-005", code: "TRN", name: "Training", companyId: "comp-1", departmentId: "dept-hr" },
  { id: "div-006", code: "B2B", name: "B2B Sales", companyId: "comp-2", departmentId: "dept-sales" },
]
export const initialJobTitles = [
  { id: "jt-001", code: "FED", name: "Frontend Dev", companyId: "comp-1", divisionId: "div-001", levelId: "lv-003" },
  { id: "jt-002", code: "BED", name: "Backend Dev", companyId: "comp-1", divisionId: "div-001", levelId: "lv-003" },
  { id: "jt-003", code: "FSD", name: "Fullstack Dev", companyId: "comp-1", divisionId: "div-001", levelId: "lv-004" },
  { id: "jt-004", code: "AND", name: "Android Dev", companyId: "comp-1", divisionId: "div-002", levelId: "lv-003" },
  { id: "jt-005", code: "IOS", name: "iOS Dev", companyId: "comp-1", divisionId: "div-002", levelId: "lv-003" },
  { id: "jt-006", code: "DEV", name: "DevOps", companyId: "comp-1", divisionId: "div-003", levelId: "lv-004" },
  { id: "jt-007", code: "HRG", name: "HR Generalist", companyId: "comp-1", divisionId: "div-004", levelId: "lv-002" },
  { id: "jt-008", code: "HRM", name: "HR Manager", companyId: "comp-1", divisionId: "div-004", levelId: "lv-005" },
]
export const initialJobLevels = [
  { id: "lv-001", code: "INT", name: "Intern", companyId: "comp-1", grade: "0", minSalary: 0, maxSalary: 2500000 },
  { id: "lv-002", code: "JUN", name: "Junior", companyId: "comp-1", grade: "1-2", minSalary: 5000000, maxSalary: 8000000 },
  { id: "lv-003", code: "MID", name: "Mid-Level", companyId: "comp-1", grade: "3-4", minSalary: 8000000, maxSalary: 15000000 },
  { id: "lv-004", code: "SEN", name: "Senior", companyId: "comp-1", grade: "5-6", minSalary: 15000000, maxSalary: 25000000 },
  { id: "lv-005", code: "MGR", name: "Manager", companyId: "comp-1", grade: "7-8", minSalary: 25000000, maxSalary: 45000000 },
  { id: "lv-006", code: "DIR", name: "Director", companyId: "comp-1", grade: "9-10", minSalary: 45000000, maxSalary: 80000000 },
]
export const initialWorkAreas = [
  { id: "wa-001", code: "HQ-BDG", name: "HQ Bandung", companyId: "comp-1", location: "Bandung", type: "Office" },
  { id: "wa-002", code: "BR-JKT", name: "Branch Jakarta", companyId: "comp-1", location: "Jakarta Selatan", type: "Office" },
  { id: "wa-003", code: "SITE-1", name: "Site Project A", companyId: "comp-3", location: "Cikarang", type: "Site" },
  { id: "wa-004", code: "WH-BDG", name: "Warehouse", companyId: "comp-1", location: "Bandung", type: "Warehouse" },
  { id: "wa-005", code: "RMT", name: "Remote Workers", companyId: "comp-1", location: "Indonesia", type: "Remote" },
]