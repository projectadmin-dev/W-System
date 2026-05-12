"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import Link from "next/link"

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

interface QuotationForm {
  title: string
  description: string
  brief_id: string
  client_id: string
  commercial_pic_id: string
  tenant_id: string
  line_items: LineItem[]
  tax_rate: number
  discount_percent: number
  currency: string
  payment_terms: string
  validity_days: number
}

const profile = { user: { name: "User", email: "user@wit.id", avatar: "/avatars/user.jpg" } }

export default function NewQuotationPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<QuotationForm>({
    title: "",
    description: "",
    brief_id: "",
    client_id: "",
    commercial_pic_id: "",
    tenant_id: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0 }],
    tax_rate: 11,
    discount_percent: 0,
    currency: "IDR",
    payment_terms: "50% down payment, 50% on delivery",
    validity_days: 30,
  })

  const addLineItem = () => {
    setForm({ ...form, line_items: [...form.line_items, { description: "", quantity: 1, unit_price: 0 }] })
  }

  const removeLineItem = (index: number) => {
    setForm({ ...form, line_items: form.line_items.filter((_, i) => i !== index) })
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const items = [...form.line_items]
    items[index] = { ...items[index], [field]: value }
    setForm({ ...form, line_items: items })
  }

  const calcTotals = () => {
    const subtotal = form.line_items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0)
    const tax = subtotal * (Number(form.tax_rate) / 100)
    const discount = subtotal * (Number(form.discount_percent) / 100)
    return { subtotal, tax, discount, total: subtotal + tax - discount }
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      setError(null)

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (res.ok) {
        router.push(`/quotations/${data.id}`)
      } else {
        setError(data.error || "Failed to create quotation")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const totals = calcTotals()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/quotations">Quotations</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>New Quotation</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/quotations"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Cancel</Button></Link>
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md border border-red-200">{error}</div>
          )}

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">New Quotation</h1>
            <Button onClick={handleSubmit} disabled={saving} size="sm">
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save Quotation"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g., Website Development for PT ABC"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of the proposal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Client ID *</Label>
                      <Input
                        value={form.client_id}
                        onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                        placeholder="UUID from clients table"
                      />
                    </div>
                    <div>
                      <Label>Project Brief ID *</Label>
                      <Input
                        value={form.brief_id}
                        onChange={(e) => setForm({ ...form, brief_id: e.target.value })}
                        placeholder="UUID from project_briefs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Commercial PIC ID *</Label>
                      <Input
                        value={form.commercial_pic_id}
                        onChange={(e) => setForm({ ...form, commercial_pic_id: e.target.value })}
                        placeholder="UUID user profile"
                      />
                    </div>
                    <div>
                      <Label>Tenant ID *</Label>
                      <Input
                        value={form.tenant_id}
                        onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                        placeholder="UUID tenant"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Line Items</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="w-4 h-4 mr-1" />Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.line_items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-6">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(i)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between"><span>Subtotal</span><span>Rp {totals.subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Tax ({form.tax_rate}%)</span><span>Rp {totals.tax.toLocaleString()}</span></div>
                  {form.discount_percent > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount ({form.discount_percent}%)</span>
                      <span>-Rp {totals.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>Rp {totals.total.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={form.tax_rate}
                      onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      value={form.discount_percent}
                      onChange={(e) => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={form.currency} disabled />
                  </div>
                  <div>
                    <Label>Validity (days)</Label>
                    <Input
                      type="number"
                      value={form.validity_days}
                      onChange={(e) => setForm({ ...form, validity_days: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Textarea
                      value={form.payment_terms}
                      onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
