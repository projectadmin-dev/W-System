"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Label } from "@workspace/ui/components/label"
import {
  Switch,
} from "@workspace/ui/components/switch"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Gift, Save } from "lucide-react"

interface ThrConfig {
  payment_timing: "with_payroll" | "separate"
  calculation_base: "basic_salary" | "basic_plus_fixed_allowances"
  is_active: boolean
}

interface ThrSetting {
  id: string
  year: number
  religion: string
  holiday_name: string
  holiday_date: string
  payment_date: string
  cut_off_date: string
  status: "draft" | "active" | "paid" | "cancelled"
}

interface ThrEligibility {
  id: string
  employee_name: string
  months_worked: number
  basic_salary: number
  thr_amount: number
  override_amount: number | null
  status: "pending" | "eligible" | "not_eligible" | "approved" | "rejected"
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockConfig: ThrConfig = { payment_timing: "separate", calculation_base: "basic_salary", is_active: true }

const mockSettings: ThrSetting[] = [
  { id: "1", year: 2026, religion: "Islam", holiday_name: "Idul Fitri 1447H", holiday_date: "2026-06-17", payment_date: "2026-06-10", cut_off_date: "2026-06-05", status: "active" },
  { id: "2", year: 2026, religion: "Kristen", holiday_name: "Natal 2026", holiday_date: "2026-12-25", payment_date: "2026-12-18", cut_off_date: "2026-12-12", status: "draft" },
]

const mockEligibilities: ThrEligibility[] = [
  { id: "1", employee_name: "Ahmad Rizky", months_worked: 24, basic_salary: 8000000, thr_amount: 8000000, override_amount: null, status: "approved" },
  { id: "2", employee_name: "Siti Nurhaliza", months_worked: 14, basic_salary: 10000000, thr_amount: 10000000, override_amount: null, status: "approved" },
  { id: "3", employee_name: "Budi Santoso", months_worked: 8, basic_salary: 6000000, thr_amount: 4000000, override_amount: null, status: "eligible" },
  { id: "4", employee_name: "Dewi Lestari", months_worked: 3, basic_salary: 5500000, thr_amount: 1375000, override_amount: null, status: "eligible" },
  { id: "5", employee_name: "Rendi Pratama", months_worked: 0, basic_salary: 7000000, thr_amount: 0, override_amount: null, status: "not_eligible" },
]

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  paid: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  eligible: "bg-emerald-100 text-emerald-700",
  not_eligible: "bg-red-100 text-red-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
}

export default function ThrSettingsPage() {
  const [config, setConfig] = useState<ThrConfig>(mockConfig)
  const [settings, setSettings] = useState<ThrSetting[]>([])
  const [eligibilities, setEligibilities] = useState<ThrEligibility[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setSettings(mockSettings)
      setEligibilities(mockEligibilities)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">THR Settings</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1"><Gift className="h-4 w-4" /> Konfigurasi Tunjangan Hari Raya</p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Konfigurasi</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan Per Tahun</TabsTrigger>
          <TabsTrigger value="eligibility">Kelayakan Karyawan</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi THR</CardTitle>
              <CardDescription>Pengaturan umum perhitungan THR</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Waktu Pembayaran</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="timing" checked={config.payment_timing === "with_payroll"} onChange={() => setConfig(p => ({ ...p, payment_timing: "with_payroll" }))} />
                    <span className="text-sm">Bersama Payroll</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="timing" checked={config.payment_timing === "separate"} onChange={() => setConfig(p => ({ ...p, payment_timing: "separate" }))} />
                    <span className="text-sm">Terpisah</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dasar Perhitungan</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="base" checked={config.calculation_base === "basic_salary"} onChange={() => setConfig(p => ({ ...p, calculation_base: "basic_salary" }))} />
                    <span className="text-sm">Gaji Pokok</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="base" checked={config.calculation_base === "basic_plus_fixed_allowances"} onChange={() => setConfig(p => ({ ...p, calculation_base: "basic_plus_fixed_allowances" }))} />
                    <span className="text-sm">Gaji Pokok + Tunjangan Tetap</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Status Aktif</Label>
                  <p className="text-xs text-muted-foreground">Aktifkan fitur THR</p>
                </div>
                <Switch checked={config.is_active} onCheckedChange={v => setConfig(p => ({ ...p, is_active: v }))} />
              </div>
              <Button><Save className="h-4 w-4 mr-2" /> Simpan Konfigurasi</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengaturan THR Per Tahun</CardTitle>
              <CardDescription>Jadwal pembayaran per agama/hari raya</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Agama</TableHead>
                    <TableHead>Hari Raya</TableHead>
                    <TableHead>Tanggal Libur</TableHead>
                    <TableHead>Tanggal Bayar</TableHead>
                    <TableHead>Cut Off</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.year}</TableCell>
                      <TableCell>{s.religion}</TableCell>
                      <TableCell className="font-medium">{s.holiday_name}</TableCell>
                      <TableCell>{s.holiday_date}</TableCell>
                      <TableCell>{s.payment_date}</TableCell>
                      <TableCell>{s.cut_off_date}</TableCell>
                      <TableCell><Badge className={statusColor[s.status]}>{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kelayakan THR Karyawan</CardTitle>
              <CardDescription>Perhitungan THR berdasarkan masa kerja</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead>Masa Kerja</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>THR</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibilities.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.employee_name}</TableCell>
                      <TableCell>{e.months_worked} bulan</TableCell>
                      <TableCell className="font-mono">{formatRupiah(e.basic_salary)}</TableCell>
                      <TableCell className="font-mono">{formatRupiah(e.thr_amount)}</TableCell>
                      <TableCell className="font-mono">{e.override_amount ? formatRupiah(e.override_amount) : "-"}</TableCell>
                      <TableCell><Badge className={statusColor[e.status]}>{e.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
