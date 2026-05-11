"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Switch,
} from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import { Save, Calculator, RotateCcw } from "lucide-react"

interface ProRateConfig {
  name: string
  default_working_days: number
  prorate_salary: boolean
  prorate_allowances: boolean
  payroll_cutoff_date: number
}

const defaultConfig: ProRateConfig = {
  name: "Default Pro-Rate",
  default_working_days: 22,
  prorate_salary: true,
  prorate_allowances: true,
  payroll_cutoff_date: 23,
}

export default function ProRateConfigPage() {
  const [config, setConfig] = useState<ProRateConfig>(defaultConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => setLoading(false), 500) }, [])

  function update(key: keyof ProRateConfig, value: string | number | boolean) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pro-Rate Configuration</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1"><Calculator className="h-4 w-4" /> Pengaturan perhitungan pro-rata untuk join/resign tengah bulan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Umum</CardTitle>
          <CardDescription>Konfigurasi dasar pro-rata gaji</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Konfigurasi</Label>
              <Input value={config.name} onChange={e => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hari Kerja Default per Bulan</Label>
              <Input type="number" min={1} max={31} value={config.default_working_days} onChange={e => update("default_working_days", parseInt(e.target.value) || 22)} />
              <p className="text-xs text-muted-foreground">Standar: 22 hari kerja/bulan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope Pro-Rata</CardTitle>
          <CardDescription>Komponen mana yang di-prorate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Pro-rata Gaji Pokok</Label>
              <p className="text-xs text-muted-foreground">Hitung gaji pokok berdasarkan hari kerja aktual</p>
            </div>
            <Switch checked={config.prorate_salary} onCheckedChange={v => update("prorate_salary", v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Pro-rata Tunjangan</Label>
              <p className="text-xs text-muted-foreground">Hitung tunjangan tetap & pro-rated berdasarkan hari kerja aktual</p>
            </div>
            <Switch checked={config.prorate_allowances} onCheckedChange={v => update("prorate_allowances", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cut-off Payroll</CardTitle>
          <CardDescription>Tanggal batas untuk penghitungan payroll bulanan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tanggal Cut-off</Label>
            <Input type="number" min={1} max={31} value={config.payroll_cutoff_date} onChange={e => update("payroll_cutoff_date", parseInt(e.target.value) || 23)} />
            <p className="text-xs text-muted-foreground">
              Karyawan join sebelum tanggal {config.payroll_cutoff_date} masuk payroll bulan berjalan.
              Join setelah tanggal {config.payroll_cutoff_date} masuk payroll bulan berikutnya.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Perubahan"}
        </Button>
        <Button variant="outline" onClick={() => { setConfig(defaultConfig); setSaved(false) }}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset Default
        </Button>
      </div>
    </div>
  )
}
