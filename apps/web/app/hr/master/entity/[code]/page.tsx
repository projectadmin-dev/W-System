import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getMockEntities, getTipeLabel } from "@/lib/entities-data"

// Metadata
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const entities = getMockEntities()
  const entity = entities.find((e) => e.code === code)
  return {
    title: entity ? `Detail Entity - ${entity.name}` : "Entity Not Found",
  }
}

export default async function EntityDetailPage({ params }: { params: Promise<{ code: string }> }) {
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
        <h1 className="text-2xl font-bold tracking-tight">Detail Entity</h1>
        <p className="text-muted-foreground">Informasi detail entity {entity.name}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/hr/master/entity">← Kembali ke Daftar</Link>
        </Button>
        <Button asChild>
          <Link href={`/hr/master/entity/${entity.code}/edit`}>✏️ Edit Entity</Link>
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Informasi Umum</TabsTrigger>
          <TabsTrigger value="bpjs">BPJS Konfigurasi</TabsTrigger>
          <TabsTrigger value="pph21">PPh21/PPH23</TabsTrigger>
          <TabsTrigger value="allowances">Allowances</TabsTrigger>
        </TabsList>

        {/* COMPANY INFO TAB */}
        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Umum Perusahaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Kode Entity</label>
                  <Input defaultValue={entity.code} readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Nama Entity</label>
                  <Input defaultValue={entity.name} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Tipe Entity</label>
                  <Input defaultValue={`${getTipeLabel(entity.type)} (${entity.type})`} readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Kota</label>
                  <Input defaultValue={entity.city} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Status</label>
                  <Input defaultValue={entity.status} readOnly className={entity.status === "Active" ? "text-green-600 font-medium" : ""} />
                </div>
                {entity.legalEntity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Legal Entity</label>
                    <Input defaultValue={entity.legalEntity} />
                  </div>
                )}
                {entity.npwp && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">NPWP</label>
                    <Input defaultValue={entity.npwp} />
                  </div>
                )}
                {entity.parentCode && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Parent Entity (Kantor Pusat)</label>
                    <Input defaultValue={entity.parentCode} readOnly />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Alamat</label>
                  <Textarea defaultValue={entity.address} rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Telepon</label>
                  <Input defaultValue={entity.phone} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Email</label>
                  <Input defaultValue={entity.email} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Website</label>
                  <Input defaultValue={entity.website || "-"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BPJS CONFIG TAB */}
        <TabsContent value="bpjs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>BPJS Konfigurasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Kesehatan - Employee</label>
                  <Input defaultValue={entity.bpjsSettings.healthInsurance.employee} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Kesehatan - Company</label>
                  <Input defaultValue={entity.bpjsSettings.healthInsurance.company} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Pensiun - Employee</label>
                  <Input defaultValue={entity.bpjsSettings.pension.employee} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Pensiun - Company</label>
                  <Input defaultValue={entity.bpjsSettings.pension.company} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PPh21 TAB */}
        <TabsContent value="pph21" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>PPh21 / PPh23 Konfigurasi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Placeholder — konfigurasi PPh21 & PPh23 akan ditampilkan di sini.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALLOWANCES TAB */}
        <TabsContent value="allowances" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Allowances & Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Placeholder — allowance rules akan ditampilkan di sini.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
