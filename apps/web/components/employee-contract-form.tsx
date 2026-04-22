"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Loader2Icon } from "lucide-react"

const contractSchema = z.object({
  contract_type: z.enum(["pkwt", "pkwtt", "freelance", "pt", "magang"]),
  contract_no: z.string().min(1, "Contract number required"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().optional().or(z.literal("")),
  probation_end_date: z.string().optional().or(z.literal("")),
  position_id: z.string().uuid().optional().or(z.literal("")),
  department_id: z.string().uuid().optional().or(z.literal("")),
  grade_id: z.string().uuid().optional().or(z.literal("")),
  base_salary: z.string().optional().or(z.literal("")),
  work_shift_id: z.string().uuid().optional().or(z.literal("")),
  work_area_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
})

type ContractFormValues = z.infer<typeof contractSchema>

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  contract?: {
    id: string
    contract_type: string
    contract_no: string
    start_date: string
    end_date: string | null
    probation_end_date: string | null
    position_id: string | null
    department_id: string | null
    grade_id: string | null
    base_salary: number | null
    work_shift_id: string | null
    work_area_id: string | null
    is_active: boolean
  } | null
  onSuccess?: () => void
}

// Static options
const contractTypes = [
  { value: "pkwt", label: "PKWT (Fixed Term)" },
  { value: "pkwtt", label: "PKWTT (Indefinite)" },
  { value: "freelance", label: "Freelance" },
  { value: "pt", label: "Part Time" },
  { value: "magang", label: "Internship" },
]

export function ContractFormDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: ContractFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isEdit = !!contract

  // Fetch dropdown data
  const [positions, setPositions] = React.useState<{ id: string; name: string }[]>([])
  const [departments, setDepartments] = React.useState<{ id: string; name: string }[]>([])
  const [grades, setGrades] = React.useState<{ id: string; name: string }[]>([])
  const [shifts, setShifts] = React.useState<{ id: string; name: string }[]>([])
  const [areas, setAreas] = React.useState<{ id: string; name: string }[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    async function fetchDropdowns() {
      try {
        const [pRes, dRes, gRes, sRes, aRes] = await Promise.all([
          fetch("/api/hc/jabatan"),
          fetch("/api/hc/departemen"),
          fetch("/api/hc/grade"),
          fetch("/api/hc/shifts"),
          fetch("/api/hc/area-kerja"),
        ])
        const [pData, dData, gData, sData, aData] = await Promise.all([
          pRes.ok ? pRes.json() : [],
          dRes.ok ? dRes.json() : [],
          gRes.ok ? gRes.json() : [],
          sRes.ok ? sRes.json() : [],
          aRes.ok ? aRes.json() : [],
        ])
        setPositions(Array.isArray(pData) ? pData : pData.data || [])
        setDepartments(Array.isArray(dData) ? dData : dData.data || [])
        setGrades(Array.isArray(gData) ? gData : gData.data || [])
        setShifts(Array.isArray(sData) ? sData : sData.data || [])
        setAreas(Array.isArray(aData) ? aData : aData.data || [])
      } catch (e) {
        console.error("Error fetching dropdowns:", e)
        toast.error("Failed to load some dropdown options")
      } finally {
        setIsLoadingDropdowns(false)
      }
    }
    fetchDropdowns()
  }, [open])

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: (contract?.contract_type as any) || "pkwt",
      contract_no: contract?.contract_no || "",
      start_date: contract?.start_date?.slice(0, 10) || "",
      end_date: contract?.end_date?.slice(0, 10) || "",
      probation_end_date: contract?.probation_end_date?.slice(0, 10) || "",
      position_id: contract?.position_id || "",
      department_id: contract?.department_id || "",
      grade_id: contract?.grade_id || "",
      base_salary: contract?.base_salary ? String(contract.base_salary) : "",
      work_shift_id: contract?.work_shift_id || "",
      work_area_id: contract?.work_area_id || "",
      is_active: contract?.is_active ?? true,
    },
  })

  // Reset form when contract prop changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        contract_type: (contract?.contract_type as any) || "pkwt",
        contract_no: contract?.contract_no || "",
        start_date: contract?.start_date?.slice(0, 10) || "",
        end_date: contract?.end_date?.slice(0, 10) || "",
        probation_end_date: contract?.probation_end_date?.slice(0, 10) || "",
        position_id: contract?.position_id || "",
        department_id: contract?.department_id || "",
        grade_id: contract?.grade_id || "",
        base_salary: contract?.base_salary ? String(contract.base_salary) : "",
        work_shift_id: contract?.work_shift_id || "",
        work_area_id: contract?.work_area_id || "",
        is_active: contract?.is_active ?? true,
      })
    }
  }, [open, contract, form])

  async function onSubmit(data: ContractFormValues) {
    setIsSubmitting(true)
    try {
      const url = isEdit
        ? `/api/hc/employee-contracts/${contract.id}`
        : "/api/hc/employee-contracts"
      const method = isEdit ? "PATCH" : "POST"

      const payload: any = {
        ...data,
        employee_id: employeeId,
        base_salary: data.base_salary ? Number(data.base_salary) : null,
        end_date: data.end_date || null,
        probation_end_date: data.probation_end_date || null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to save contract")

      toast.success(isEdit ? "Contract updated" : "Contract created")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contract" : "New Contract"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update contract details"
              : "Create a new employment contract"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contract Type */}
            <div className="space-y-2">
              <Label>Contract Type *</Label>
              <Select
                onValueChange={(v) => form.setValue("contract_type", v as any)}
                defaultValue={form.watch("contract_type")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.contract_type && (
                <p className="text-xs text-destructive">{form.formState.errors.contract_type.message}</p>
              )}
            </div>

            {/* Contract No */}
            <div className="space-y-2">
              <Label>Contract Number *</Label>
              <Input
                {...form.register("contract_no")}
                placeholder="PKWT/2026/001"
              />
              {form.formState.errors.contract_no && (
                <p className="text-xs text-destructive">{form.formState.errors.contract_no.message}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" {...form.register("start_date")} />
              {form.formState.errors.start_date && (
                <p className="text-xs text-destructive">{form.formState.errors.start_date.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...form.register("end_date")} />
              <p className="text-xs text-muted-foreground">Leave empty for permanent contracts</p>
            </div>

            {/* Probation End */}
            <div className="space-y-2">
              <Label>Probation End Date</Label>
              <Input type="date" {...form.register("probation_end_date")} />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                onValueChange={(v) => form.setValue("position_id", v)}
                defaultValue={form.watch("position_id") || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                onValueChange={(v) => form.setValue("department_id", v)}
                defaultValue={form.watch("department_id") || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade */}
            <div className="space-y-2">
              <Label>Job Grade</Label>
              <Select
                onValueChange={(v) => form.setValue("grade_id", v)}
                defaultValue={form.watch("grade_id") || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work Shift */}
            <div className="space-y-2">
              <Label>Work Shift</Label>
              <Select
                onValueChange={(v) => form.setValue("work_shift_id", v)}
                defaultValue={form.watch("work_shift_id") || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work Area */}
            <div className="space-y-2">
              <Label>Work Area</Label>
              <Select
                onValueChange={(v) => form.setValue("work_area_id", v)}
                defaultValue={form.watch("work_area_id") || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Base Salary */}
            <div className="space-y-2">
              <Label>Base Salary (IDR)</Label>
              <Input
                {...form.register("base_salary")}
                type="number"
                placeholder="5000000"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
              <div className="space-y-0.5">
                <Label>Active Contract</Label>
                <p className="text-sm text-muted-foreground">Mark as the current active contract</p>
              </div>
              <Switch
                checked={form.watch("is_active")}
                onCheckedChange={(v) => form.setValue("is_active", v)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingDropdowns}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Contract"
              ) : (
                "Create Contract"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
