"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  FileText,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react"

interface Contract {
  id: string
  contract_no: string
  contract_type: string
  start_date: string
  end_date: string | null
  probation_end_date: string | null
  base_salary: number | null
  is_active: boolean
  termination_reason: string | null
  termination_date: string | null
  document_url: string | null
  signed_at: string | null
  created_at: string
  position?: { name: string } | null
  department?: { name: string } | null
  grade?: { name: string } | null
}

interface EmployeeContractsTabProps {
  employeeId: string
}

export function EmployeeContractsTab({ employeeId }: EmployeeContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchContracts() {
      try {
        const res = await fetch(`/api/hc/employee-contracts?employee_id=${employeeId}`)
        if (!res.ok) throw new Error("Failed to fetch contracts")
        const result = await res.json()
        setContracts(result.data || [])
      } catch (error) {
        console.error(error)
        toast.error("Failed to load contracts")
      } finally {
        setIsLoading(false)
      }
    }
    fetchContracts()
  }, [employeeId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pkwt: "PKWT (Fixed Term)",
      pkwtt: "PKWTT (Indefinite)",
      freelance: "Freelance",
      pt: "Part Time",
      magang: "Internship",
    }
    return labels[type] || type.toUpperCase()
  }

  const getStatusBadge = (contract: Contract) => {
    if (!contract.is_active) {
      return <Badge variant="destructive">{contract.termination_reason || "Terminated"}</Badge>
    }
    if (contract.end_date) {
      const end = new Date(contract.end_date)
      const now = new Date()
      if (end < now) return <Badge variant="secondary">Expired</Badge>
    }
    return <Badge variant="default" className="bg-green-600">Active</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Employment Contracts</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Contract
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No contracts found for this employee.</p>
            <p className="text-sm">Click "Add Contract" to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className={contract.is_active ? "border-green-200 dark:border-green-900" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {contract.contract_no}
                      {getStatusBadge(contract)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getContractTypeLabel(contract.contract_type)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!contract.is_active && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Start Date
                    </p>
                    <p className="font-medium">{new Date(contract.start_date).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> End Date
                    </p>
                    <p className="font-medium">
                      {contract.end_date
                        ? new Date(contract.end_date).toLocaleDateString("id-ID")
                        : "Permanent"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> Position
                    </p>
                    <p className="font-medium">{contract.position?.name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" /> Department
                    </p>
                    <p className="font-medium">{contract.department?.name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" /> Base Salary
                    </p>
                    <p className="font-medium">
                      {contract.base_salary
                        ? "Rp " + contract.base_salary.toLocaleString("id-ID")
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> Contract Doc
                    </p>
                    <p className="font-medium">
                      {contract.document_url ? (
                        <a
                          href={contract.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
