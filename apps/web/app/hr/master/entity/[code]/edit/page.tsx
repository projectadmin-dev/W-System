import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getMockEntities, getTipeLabel } from "@/lib/entities-data"

// Metadata
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const entities = getMockEntities()
  const entity = entities.find((e) => e.code === code)
  return {
    title: entity ? `Edit Entity - ${entity.name}` : "Entity Not Found",
  }
}

export default async function EditEntityPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const entities = getMockEntities()
  const entity = entities.find((e) => e.code === code)

  if (!entity) {
    return notFound()
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Edit Entity</h1>
        <p className="text-muted-foreground">Perbarui data entity {entity.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Entity — {entity.code}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kode — Read Only */}
            <div>
              <Label htmlFor="code" className="text-sm font-medium text-muted-foreground">
                Kode Entity *
              </Label>
              <Input id="code" defaultValue={entity.code} readOnly className="mt-2 bg-muted" />
            </div>

            {/* Nama */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                Nama Entity *
              </Label>
              <Input id="name" defaultValue={entity.name} className="mt-2" />
            </div>

            {/* Tipe */}
            <div>
              <Label htmlFor="type" className="text-sm font-medium text-muted-foreground">
                Tipe Entity *
              </Label>
              <select
                id="type"
                defaultValue={entity.type}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
              >
                <option value="HO">Kantor Pusat (HO)</option>
                <option value="BO">Kantor Cabang (BO)</option>
              </select>
            </div>

            {/* Kota */}
            <div>
              <Label htmlFor="city" className="text-sm font-medium text-muted-foreground">
                Kota *
              </Label>
              <Input id="city" defaultValue={entity.city} className="mt-2" />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">
                Status
              </Label>
              <select
                id="status"
                defaultValue={entity.status}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Alamat */}
            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium text-muted-foreground">
                Alamat Lengkap
              </Label>
              <Textarea id="address" defaultValue={entity.address} className="w-full mt-2" rows={3} />
            </div>

            {/* NPWP */}
            <div>
              <Label htmlFor="npwp" className="text-sm font-medium text-muted-foreground">
                NPWP
              </Label>
              <Input id="npwp" defaultValue={entity.npwp || ""} placeholder="Contoh: 01.234.567.8-901.000" className="mt-2" />
            </div>

            {/* Telepon */}
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                Telepon
              </Label>
              <Input id="phone" defaultValue={entity.phone} placeholder="Contoh: +62 21 1234 5678" className="mt-2" />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <Input id="email" type="email" defaultValue={entity.email} placeholder="Contoh: info@wit.id" className="mt-2" />
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website" className="text-sm font-medium text-muted-foreground">
                Website
              </Label>
              <Input id="website" type="url" defaultValue={entity.website || ""} placeholder="Contoh: https://www.wit.id" className="mt-2" />
            </div>

            {/* Legal Entity (khusus HO) */}
            {entity.type === "HO" && (
              <div>
                <Label htmlFor="legalEntity" className="text-sm font-medium text-muted-foreground">
                  Legal Entity *
                </Label>
                <Input id="legalEntity" defaultValue={entity.legalEntity || ""} placeholder="Nama PT/CV" className="mt-2" />
              </div>
            )}

            {/* Parent Code (khusus BO) */}
            {entity.type === "BO" && (
              <div>
                <Label htmlFor="parentCode" className="text-sm font-medium text-muted-foreground">
                  Parent Entity (Kantor Pusat) *
                </Label>
                <Input id="parentCode" defaultValue={entity.parentCode || ""} placeholder="Contoh: WLBS" className="mt-2" />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button type="submit">Simpan Perubahan</Button>
            <Button variant="outline" type="button" asChild>
              <Link href={`/hr/master/entity/${entity.code}`}>Batal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
