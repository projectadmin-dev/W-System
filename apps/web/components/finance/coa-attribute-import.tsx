'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  DownloadIcon, UploadIcon, FileSpreadsheetIcon, CheckCircleIcon,
  AlertTriangleIcon, Loader2Icon
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@workspace/ui/components/dialog'
import { Badge } from '@workspace/ui/components/badge'

interface CoaAttributeImportProps {
  onSuccess?: () => void
}

const layerNames: Record<string, string> = {
  category: 'Account Category',
  type: 'Account Type',
  sub: 'Sub Account Type',
  gl: 'General Ledger',
  detail: 'Detail Ledger',
}

export default function CoaAttributeImport({ onSuccess }: CoaAttributeImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function downloadTemplate(layer?: string) {
    setDownloading(true)
    try {
      const params = layer ? `?layer=${layer}&template=1` : '?template=1'
      const res = await fetch(`/api/finance/coa/hierarchy${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      
      // Convert to CSV per layer
      const lines: string[] = []
      lines.push('Layer,COA Full Code,Name,Flag,Value')
      
      for (const [layerKey, records] of Object.entries(data as Record<string, any[]>)) {
        for (const rec of records) {
          const flags = getEditableFlags(layerKey, rec)
          for (const [flag, value] of Object.entries(flags)) {
            lines.push(`${layerKey},"${rec.coa_full_code}","${rec.name}",${flag},${value ?? ''}`)
          }
        }
      }
      
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `COA_Attribute_Template_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('Template downloaded')
    } catch {
      toast.error('Failed to download template')
    } finally { setDownloading(false) }
  }

  function getEditableFlags(layer: string, rec: any): Record<string, any> {
    const flagMap: Record<string, string[]> = {
      category: ['normal_balance', 'enum_laporan_keuangan', 'enum_laporan_keuangan_category'],
      type: ['contra_account', 'direct_indirect_cost', 'enum_cost_category'],
      sub: ['is_restricted', 'enum_cf_section', 'enum_cf_line', 'is_working_capital', 'is_non_cash_item', 'enum_cost_behavior', 'is_budgeted', 'is_tax_deductible'],
      gl: ['is_restricted'],
      detail: ['required_sub_gl', 'is_washed_out_account', 'is_trial_balance', 'is_taxation_report'],
    }
    const flags: Record<string, any> = {}
    for (const key of flagMap[layer] || []) {
      flags[key] = rec[key]
    }
    return flags
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').slice(1).filter(l => l.trim())
      
      // Parse CSV: Layer,COA Full Code,Name,Flag,Value
      const rows: any[] = []
      for (const line of lines) {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        if (cols.length >= 4) {
          rows.push({
            layer: cols[0],
            coa_full_code: cols[1],
            name: cols[2],
            flag: cols[3],
            value: cols[4] || null,
          })
        }
      }
      
      // Group by layer + coa_full_code
      const grouped: Record<string, { layer: string; coa_full_code: string; name: string; updates: Record<string, any> }> = {}
      for (const r of rows) {
        const key = `${r.layer}-${r.coa_full_code}`
        if (!grouped[key]) grouped[key] = { layer: r.layer, coa_full_code: r.coa_full_code, name: r.name, updates: {} }
        // Convert "true"/"false" to boolean, empty to null
        let val: any = r.value
        if (val === 'true') val = true
        else if (val === 'false') val = false
        else if (val === '' || val === null || val === undefined) {
          // skip - no update
          continue
        }
        grouped[key].updates[r.flag] = val
      }
      
      const payload = Object.values(grouped).filter(g => Object.keys(g.updates).length > 0)
      
      const res = await fetch('/api/finance/coa/hierarchy/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResult(data)
      toast.success('Updated ' + data.updated + ' records')
      if (data.errors?.length > 0) {
        toast.warning(data.errors.length + ' errors - check details')
      }
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="gap-2">
        <FileSpreadsheetIcon className="h-4 w-4" />
        COA Attribute Import
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>COA Attribute Import</DialogTitle>
            <DialogDescription>
              Download template, edit flags, then upload to bulk-update COA attributes.
              Cannot create or delete accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 1: Download Template</CardTitle>
                <CardDescription className="text-xs">
                  All 5 layers included. Locked columns are pre-filled. Only edit colored columns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(layerNames).map(([key, name]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2"
                      onClick={() => downloadTemplate(key)}
                      disabled={downloading}
                    >
                      {downloading ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <DownloadIcon className="h-3 w-3" />}
                      {name.slice(0, 10)}...
                    </Button>
                  ))}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="mt-2 w-full gap-2 text-xs"
                  onClick={() => downloadTemplate()}
                  disabled={downloading}
                >
                  {downloading ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <DownloadIcon className="h-3 w-3" />}
                  Download All Layers (CSV)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 2: Upload Edited CSV</CardTitle>
                <CardDescription className="text-xs">
                  Upload your edited CSV. Only flags will be updated. No create/delete.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheetIcon className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to select CSV file</p>
                    </>
                  )}
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={!file || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" /> Upload & Update
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Updated: <strong>{result.updated}</strong> records</span>
                  </div>
                  {result.skipped > 0 && (
                    <div className="flex items-center gap-3">
                      <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
                      <span className="text-sm">Skipped: <strong>{result.skipped}</strong> records</span>
                    </div>
                  )}
                  {result.errors?.length > 0 && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded max-h-24 overflow-y-auto">
                      {result.errors.map((e: any, i: number) => (
                        <div key={i}>{e.coa_full_code}: {e.reason}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
