import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import Link from "next/link"

export default function AddEntityPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Tambah Entity Baru</h1>
        <p className="text-muted-foreground">Isi data untuk membuat entity (cabang/ unit bisnis) baru</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Umum Entity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="code" className="text-sm font-medium text-muted-foreground">
                Kode Entity *
              </Label>
              <Input id="code" placeholder="Contoh: WIT-JTI" className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">Kode unik entity (maks 10 karakter)</p>
            </div>
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                Nama Entity *
              </Label>
              <Input id="name" placeholder="Contoh: WIT Jakarta Timur" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="type" className="text-sm font-medium text-muted-foreground">
                Tipe Entity *
              </Label>
              <select id="type" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2">
                <option value="">Pilih tipe...</option>
                <option value="HO">Kantor Pusat (HO)</option>
                <option value="BO">Kantor Cabang (BO)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="city" className="text-sm font-medium text-muted-foreground">
                Kota *
              </Label>
              <Input id="city" placeholder="Contoh: Jakarta" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">
                Status
              </Label>
              <select id="status" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium text-muted-foreground">
                Alamat Lengkap
              </Label>
              <Textarea id="address" placeholder="Jl. No., Kelurahan, Kecamatan, Kota, Provinsi" className="w-full mt-2" rows={3} />
            </div>
            <div>
              <Label htmlFor="npwp" className="text-sm font-medium text-muted-foreground">
                NPWP
              </Label>
              <Input id="npwp" placeholder="Contoh: 01.234.567.8-901.000" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                Telepon
              </Label>
              <Input id="phone" placeholder="Contoh: +62 21 1234 5678" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <Input id="email" type="email" placeholder="Contoh: info@wit.id" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="website" className="text-sm font-medium text-muted-foreground">
                Website
              </Label>
              <Input id="website" type="url" placeholder="Contoh: https://www.wit.id" className="mt-2" />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button type="submit">Simpan Entity</Button>
            <Button variant="outline" type="button" asChild>
              <Link href="/hr/master/entity">Batal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
