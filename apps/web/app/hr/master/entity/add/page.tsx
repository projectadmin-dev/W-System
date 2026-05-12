"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import Link from "next/link"
import { Building2, GitBranch, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface FormState {
  code: string
  name: string
  type: "holding" | "subsidiary"
  parent_id: string
  status: "active" | "inactive"
  settings: {
    description: string
    npwp: string
    phone: string
    email: string
    address: string
  }
}

interface HoldingEntity {
  id: string
  name: string
  code: string
}

const initialForm: FormState = {
  code: "",
  name: "",
  type: "holding",
  parent_id: "",
  status: "active",
  settings: {
    description: "",
    npwp: "",
    phone: "",
    email: "",
    address: "",
  },
}

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.code.trim()) errors.code = "Kode entity wajib diisi"
  else if (form.code.trim().length > 10) errors.code = "Kode maksimal 10 karakter"
  if (!form.name.trim()) errors.name = "Nama entity wajib diisi"
  if (form.type === "subsidiary" && !form.parent_id) errors.parent_id = "Holding induk wajib dipilih untuk Subsidiary"
  return errors
}

export default function AddEntityPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [holdings, setHoldings] = useState<HoldingEntity[]>([])
  const [loadingHoldings, setLoadingHoldings] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (form.type === "subsidiary") {
      setLoadingHoldings(true)
      fetch("/api/entities?type=holding&status=active")
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data.data ?? [])
          setHoldings(list)
        })
        .catch(() => setHoldings([]))
        .finally(() => setLoadingHoldings(false))
    } else {
      setForm(p => ({ ...p, parent_id: "" }))
    }
  }, [form.type])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(p => ({ ...p, [key]: value }))
    if (errors[key]) setErrors(p => { const e = { ...p }; delete e[key]; return e })
  }

  function setSettingsField(key: keyof FormState["settings"], value: string) {
    setForm(p => ({ ...p, settings: { ...p.settings, [key]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    setResult(null)

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      type: form.type,
      parent_id: form.type === "subsidiary" ? form.parent_id : null,
      status: form.status,
      settings: form.settings,
    }

    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan entity")
      setResult({ ok: true, message: "Entity berhasil disimpan! Mengarahkan ke daftar entity..." })
      setTimeout(() => router.push("/hr/master/entity"), 1200)
    } catch (err: any) {
      setResult({ ok: false, message: err.message ?? "Terjadi kesalahan" })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedHolding = holdings.find(h => h.id === form.parent_id)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/hr" className="hover:text-foreground">HR Management</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/hr/master/entity" className="hover:text-foreground">Entity Management</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Tambah Entity</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Entity Baru</h1>
        <p className="text-muted-foreground mt-1">Buat holding atau subsidiary baru untuk struktur organisasi</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipe Entity *</CardTitle>
            <CardDescription>Pilih apakah ini Holding (induk) atau Subsidiary (cabang)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setField("type", "holding")}
                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors ${
                  form.type === "holding"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Holding</span>
                  {form.type === "holding" && <Badge className="ml-auto bg-primary text-primary-foreground text-xs">Dipilih</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Entitas induk / kantor pusat. Tidak memiliki parent.</p>
              </button>

              <button
                type="button"
                onClick={() => setField("type", "subsidiary")}
                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors ${
                  form.type === "subsidiary"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Subsidiary</span>
                  {form.type === "subsidiary" && <Badge className="ml-auto bg-primary text-primary-foreground text-xs">Dipilih</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Entitas cabang / anak perusahaan. Memiliki satu Holding sebagai induk.</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Parent Selector (subsidiary only) */}
        {form.type === "subsidiary" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Holding Induk *</CardTitle>
              <CardDescription>Pilih entitas holding yang menjadi induk subsidiary ini</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingHoldings ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar holding...
                </div>
              ) : holdings.length === 0 ? (
                <p className="text-sm text-amber-600">Belum ada Holding yang terdaftar. Buat Holding terlebih dahulu.</p>
              ) : (
                <select
                  value={form.parent_id}
                  onChange={e => { setField("parent_id", e.target.value); if (errors.parent_id) setErrors(p => { const er = { ...p }; delete er.parent_id; return er }) }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— Pilih Holding —</option>
                  {holdings.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              )}
              {errors.parent_id && <p className="text-xs text-destructive">{errors.parent_id}</p>}
              {selectedHolding && (
                <p className="text-xs text-muted-foreground">Induk: <span className="font-medium text-foreground">{selectedHolding.name}</span></p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Core Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Utama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">Kode Entity *</Label>
                <Input
                  id="code"
                  placeholder="Contoh: WIT-HO"
                  value={form.code}
                  onChange={e => setField("code", e.target.value.toUpperCase())}
                  maxLength={10}
                  className={errors.code ? "border-destructive" : ""}
                />
                {errors.code
                  ? <p className="text-xs text-destructive">{errors.code}</p>
                  : <p className="text-xs text-muted-foreground">Kode unik, maks 10 karakter, akan di-uppercase</p>
                }
              </div>

              <div className="space-y-1">
                <Label htmlFor="name">Nama Entity *</Label>
                <Input
                  id="name"
                  placeholder="Contoh: PT. Wira Inovasi Teknologi"
                  value={form.name}
                  onChange={e => setField("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={e => setField("status", e.target.value as "active" | "inactive")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings / Detail Tambahan (JSONB) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Tambahan</CardTitle>
            <CardDescription>Data opsional — disimpan di kolom settings (JSONB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="npwp">NPWP</Label>
                <Input
                  id="npwp"
                  placeholder="Contoh: 01.234.567.8-901.000"
                  value={form.settings.npwp}
                  onChange={e => setSettingsField("npwp", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  placeholder="Contoh: +62 21 1234 5678"
                  value={form.settings.phone}
                  onChange={e => setSettingsField("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Contoh: info@wit.id"
                  value={form.settings.email}
                  onChange={e => setSettingsField("email", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                placeholder="Jl. Contoh No. 1, Jakarta"
                rows={3}
                value={form.settings.address}
                onChange={e => setSettingsField("address", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang entity ini"
                rows={2}
                value={form.settings.description}
                onChange={e => setSettingsField("description", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payload Preview */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Preview Data yang Akan Disimpan</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(
                {
                  code: form.code.trim().toUpperCase() || "(kosong)",
                  name: form.name.trim() || "(kosong)",
                  type: form.type,
                  parent_id: form.type === "subsidiary" ? (form.parent_id || null) : null,
                  status: form.status,
                  settings: form.settings,
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>

        {/* Result message */}
        {result && (
          <div className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
            {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {result.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? "Menyimpan..." : "Simpan Entity"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/hr/master/entity">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
