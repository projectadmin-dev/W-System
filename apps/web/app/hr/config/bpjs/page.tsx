"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Save, Shield, RotateCcw } from "lucide-react"

interface BpjsConfig {
  bpjs_tk_number: string
  bpjs_kes_number: string
  jkk_rate: number
  jkm_rate: number
  jht_employee_rate: number
  jht_company_rate: number
  jp_employee_rate: number
  jp_company_rate: number
  jp_salary_cap: number
  kes_employee_rate: number
  kes_company_rate: number
  kes_salary_cap: number
  umr_override: number
  effective_date: string
}

const defaultConfig: BpjsConfig = {
  bpjs_tk_number: "12345678901",
  bpjs_kes_number: "09876543210",
  jkk_rate: 0.24,
  jkm_rate: 0.30,
  jht_employee_rate: 2.00,
  jht_company_rate: 3.70,
  jp_employee_rate: 1.00,
  jp_company_rate: 2.00,
  jp_salary_cap: 10042300,
  kes_employee_rate: 1.00,
  kes_company_rate: 4.00,
  kes_salary_cap: 12000000,
  umr_override: 0,
  effective_date: "2026-01-01",
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export default function BpjsConfigPage() {
  const [config, setConfig] = useState<BpjsConfig>(defaultConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 500)
  }, [])

  function update(key: keyof BpjsConfig, value: string | number) {
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

  function handleReset() {
    setConfig(defaultConfig)
    setSaved(false)
  }

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">BPJS Configuration</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1"><Shield className="h-4 w-4" /> Konfigurasi iuran BPJS Ketenagakerjaan & Kesehatan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identitas Perusahaan</CardTitle>
          <CardDescription>Nomor registrasi BPJS perusahaan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>No. BPJS Ketenagakerjaan</Label>
              <Input value={config.bpjs_tk_number} onChange={e => update("bpjs_tk_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>No. BPJS Kesehatan</Label>
              <Input value={config.bpjs_kes_number} onChange={e => update("bpjs_kes_number", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanggal Efektif</Label>
              <Input type="date" value={config.effective_date} onChange={e => update("effective_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>UMR Override (0 = gunakan UMR kota)</Label>
              <Input type="number" value={config.umr_override} onChange={e => update("umr_override", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BPJS Ketenagakerjaan</CardTitle>
          <CardDescription>Iuran JKK, JKM, JHT, dan JP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>JKK - Perusahaan (%)</Label>
              <Input type="number" step="0.01" value={config.jkk_rate} onChange={e => update("jkk_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>JKM - Perusahaan (%)</Label>
              <Input type="number" step="0.01" value={config.jkm_rate} onChange={e => update("jkm_rate", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>JHT - Karyawan (%)</Label>
              <Input type="number" step="0.01" value={config.jht_employee_rate} onChange={e => update("jht_employee_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>JHT - Perusahaan (%)</Label>
              <Input type="number" step="0.01" value={config.jht_company_rate} onChange={e => update("jht_company_rate", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>JP - Karyawan (%)</Label>
              <Input type="number" step="0.01" value={config.jp_employee_rate} onChange={e => update("jp_employee_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>JP - Perusahaan (%)</Label>
              <Input type="number" step="0.01" value={config.jp_company_rate} onChange={e => update("jp_company_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Batas Upah JP</Label>
              <Input type="number" value={config.jp_salary_cap} onChange={e => update("jp_salary_cap", parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">{formatRupiah(config.jp_salary_cap)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BPJS Kesehatan</CardTitle>
          <CardDescription>Iuran BPJS Kesehatan karyawan & perusahaan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Karyawan (%)</Label>
              <Input type="number" step="0.01" value={config.kes_employee_rate} onChange={e => update("kes_employee_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Perusahaan (%)</Label>
              <Input type="number" step="0.01" value={config.kes_company_rate} onChange={e => update("kes_company_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Batas Upah Kesehatan</Label>
              <Input type="number" value={config.kes_salary_cap} onChange={e => update("kes_salary_cap", parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">{formatRupiah(config.kes_salary_cap)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Perubahan"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset Default
        </Button>
      </div>
    </div>
  )
}
