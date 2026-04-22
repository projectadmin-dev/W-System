"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  File,
  FileText,
  FileImage,
  FileBadge,
  FileCheck,
  FileX,
  Upload,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react"

interface Document {
  id: string
  document_type: string
  document_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  notes: string | null
  created_at: string
  verifier?: { full_name: string } | null
}

interface EmployeeDocumentsTabProps {
  employeeId: string
}

export function EmployeeDocumentsTab({ employeeId }: EmployeeDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch(`/api/hc/employee-documents?employee_id=${employeeId}`)
        if (!res.ok) throw new Error("Failed to fetch documents")
        const result = await res.json()
        setDocuments(result.data || [])
      } catch (error) {
        console.error(error)
        toast.error("Failed to load documents")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDocuments()
  }, [employeeId])

  const getDocumentIcon = (type: string) => {
    if (type === 'passfoto' || type === 'ktp') return <FileImage className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ktp: "KTP",
      kk: "Kartu Keluarga",
      ijazah: "Ijazah",
      sertifikat: "Sertifikat",
      kontrak: "Kontrak Kerja",
      sk: "Surat Keputusan",
      passfoto: "Pass Foto",
      npwp: "NPWP",
      bpjs_card: "Kartu BPJS",
      other: "Lainnya",
    }
    return labels[type] || type
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Employee Documents</h3>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No documents found for this employee.</p>
            <p className="text-sm">Click "Upload Document" to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className={doc.is_verified ? "border-green-200 dark:border-green-900" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-muted-foreground">{getDocumentIcon(doc.document_type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{doc.document_name}</p>
                      {doc.is_verified ? (
                        <Badge variant="default" className="bg-green-600 h-5 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-5 text-xs">
                          <Clock className="h-3 w-3 mr-0.5" /> Pending
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{getDocumentTypeLabel(doc.document_type)}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>Uploaded {new Date(doc.created_at).toLocaleDateString("id-ID")}</span>
                    </div>

                    {doc.is_verified && doc.verified_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified on {new Date(doc.verified_at).toLocaleDateString("id-ID")}
                        {doc.verifier?.full_name && ` by ${doc.verifier.full_name}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {!doc.is_verified && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
