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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Save, Receipt, RotateCcw } from "lucide-react"

interface Pph21Config {
  tax_year: number
  ptkp: Record<string, number>
  pph21_brackets: { min: number; max: number; rate: number }[]
  jabatan_rate: number
  jabatan_max_annual: number
  jabatan_max_monthly: number
  non_npwp_surcharge: number
  use_ter_method: boolean
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const defaultConfig: Pph21Config = {
  tax_year: 2026,
  ptkp: {
    "TK/0": 54000000, "TK/1": 58500000, "TK/2": 63000000, "TK/3": 67500000,
    "K/0": 58500000, "K/1": 63000000, "K/2": 67500000, "K/3": 72000000,
  },
  pph21_brackets: [
    { min: 0, max: 60000000, rate: 5 },
    { min: 60000000, max: 250000000, rate: 15 },
    { min: 250000000, max: 500000000, rate: 25 },
    { min: 500000000, max: 5000000000, rate: 30 },
    { min: 5000000000, max: 0, rate: 35 },
  ],
  jabatan_rate: 5,
  jabatan_max_annual: 6000000,
  jabatan_max_monthly: 500000,
  non_npwp_surcharge: 20,
  use_ter_method: true,
}

export default function Pph21ConfigPage() {
  const [config, setConfig] = useState<Pph21Config>(defaultConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => setLoading(false), 500) }, [])

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() { setConfig(defaultConfig); setSaved(false) }

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PPh21 Configuration</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1"><Receipt className="h-4 w-4" /> Konfigurasi pajak penghasilan Pasal 21 tahun {config.tax_year}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PTKP (Penghasilan Tidak Kena Pajak)</CardTitle>
          <CardDescription>Tarif PTKP per tahun berdasarkan status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(config.ptkp).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{key}</Label>
                <p className="text-sm font-medium">{formatRupiah(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarif PPh21</CardTitle>
          <CardDescription>Bracket tarif progresif PPh Pasal 21</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Penghasilan Kena Pajak (Min)</TableHead>
                <TableHead>Penghasilan Kena Pajak (Max)</TableHead>
                <TableHead>Tarif (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.pph21_brackets.map((b, i) => (
                <TableRow key={i}>
                  <TableCell>{formatRupiah(b.min)}</TableCell>
                  <TableCell>{b.max > 0 ? formatRupiah(b.max) : "Tak terbatas"}</TableCell>
                  <TableCell className="font-medium">{b.rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Lainnya</CardTitle>
          <CardDescription>Biaya jabatan & surcharge non-NPWP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Biaya Jabatan (%)</Label>
              <Input type="number" step="0.1" value={config.jabatan_rate} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Max Tahunan</Label>
              <Input value={formatRupiah(config.jabatan_max_annual)} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Max Bulanan</Label>
              <Input value={formatRupiah(config.jabatan_max_monthly)} readOnly className="bg-muted" />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Surcharge Non-NPWP (%)</Label>
              <Input type="number" value={config.non_npwp_surcharge} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Tambahan tarif untuk karyawan tanpa NPWP</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Metode TER</Label>
                <p className="text-xs text-muted-foreground">Gunakan Tarif Efektif Rata-rata</p>
              </div>
              <Switch checked={config.use_ter_method} onCheckedChange={v => setConfig(prev => ({ ...prev, use_ter_method: v }))} />
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
