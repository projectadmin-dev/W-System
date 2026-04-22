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
import { Textarea } from "@workspace/ui/components/textarea"
import { Loader2Icon, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase"

const documentSchema = z.object({
  document_type: z.enum([
    "ktp", "kk", "ijazah", "sertifikat", "kontrak", "sk", "passfoto",
    "npwp", "bpjs_card", "other",
  ]),
  document_name: z.string().min(1, "Document name required"),
  notes: z.string().optional(),
})

type DocumentFormValues = z.infer<typeof documentSchema>

const documentTypes = [
  { value: "ktp", label: "KTP" },
  { value: "kk", label: "Kartu Keluarga" },
  { value: "ijazah", label: "Ijazah" },
  { value: "sertifikat", label: "Sertifikat" },
  { value: "kontrak", label: "Kontrak Kerja" },
  { value: "sk", label: "Surat Keputusan" },
  { value: "passfoto", label: "Pass Foto" },
  { value: "npwp", label: "NPWP" },
  { value: "bpjs_card", label: "Kartu BPJS" },
  { value: "other", label: "Lainnya" },
]

interface DocumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  onSuccess?: () => void
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  employeeId,
  onSuccess,
}: DocumentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = React.useState(0)

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      document_type: "ktp",
      document_name: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset()
      setSelectedFile(null)
      setUploadProgress(0)
    }
  }, [open, form])

  async function onSubmit(data: DocumentFormValues) {
    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    setIsSubmitting(true)
    setUploadProgress(10)

    try {
      const supabase = createClient()
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf"
      const timestamp = Date.now()
      const filePath = `${employeeId}/${data.document_type}/${timestamp}.${fileExt}`

      // Upload to Supabase Storage
      setUploadProgress(30)
      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      setUploadProgress(60)

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("employee-documents")
        .getPublicUrl(filePath)

      setUploadProgress(80)

      // Save document record to API
      const res = await fetch("/api/hc/employee-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          document_type: data.document_type,
          document_name: data.document_name,
          file_url: publicUrlData.publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          notes: data.notes || null,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to save document")

      setUploadProgress(100)
      toast.success("Document uploaded successfully")
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document file for this employee
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select
              onValueChange={(v) => form.setValue("document_type", v as any)}
              defaultValue={form.watch("document_type")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label>Document Name *</Label>
            <Input
              {...form.register("document_name")}
              placeholder="e.g. KTP Ahmad Budi"
            />
            {form.formState.errors.document_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.document_name.message}
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>File *</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
              <input
                type="file"
                id="doc-file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label
                htmlFor="doc-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to select file</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG, DOC (max 10MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Additional notes about this document..."
              rows={2}
            />
          </div>

          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
